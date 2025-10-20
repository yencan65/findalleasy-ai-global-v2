import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import compression from 'compression';
import fs from 'fs';
import Joi from 'joi';
import { nanoid } from 'nanoid';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-very-strong';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);

const DB_PATH = './server/data/db.json';
function loadDB(){ try { return JSON.parse(fs.readFileSync(DB_PATH,'utf-8')); } catch(e){ return { settings:{dynamic_pricing_enabled:true,min_commission:0.03,default_commission:0.12,deals_enabled:true}, sellers:[], feeds:[], products:[], orders:[], redirects:[] }; } }
function saveDB(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2)); }
function requireAdmin(req,res,next){ const t=req.headers['x-admin-token']; if(!t || t!==ADMIN_TOKEN) return res.status(401).json({error:'unauthorized'}); next(); }

app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({limit:'1mb'}));
app.use(express.static('public',{maxAge:'1h'}));
app.use(rateLimit({ windowMs: 60_000, max: 150, standardHeaders:true, legacyHeaders:false }));
app.use(cors({ origin:(o,cb)=>{ if(!o) return cb(null,true); if(ALLOWED_ORIGINS.length===0||ALLOWED_ORIGINS.includes(o)) return cb(null,true); return cb(new Error('CORS not allowed'), false); } }));

// --- Products & Deals
app.get('/api/products', (req,res)=>{ res.json(loadDB().products||[]); });
app.get('/api/deals', (req,res)=>{
  const db = loadDB();
  const prods = db.products || [];
  // naive: pick 10 lowest-priced items (placeholder for "best advantage" logic)
  const deals = prods.slice().sort((a,b)=>a.price-b.price).slice(0,10);
  res.json(deals);
});

// --- Compare prices (mock)
app.get('/api/compare-prices', (req,res)=>{
  const ids = (req.query.ids||'').split(',').filter(Boolean);
  const db = loadDB();
  const out = {};
  ids.forEach(id=>{
    const p = (db.products||[]).find(x=>x.id===id);
    if(!p){ out[id]={sourcePrice:null}; return; }
    const delta = (Math.random()*0.2 - 0.1); // -10..+10%
    const comp = Math.max(1, Math.round((p.price*(1+delta))*100)/100 );
    out[id] = { sourcePrice: comp };
  });
  res.json(out);
});

// --- Affiliate redirect
app.get('/api/redirect', (req,res)=>{
  const id = String(req.query.id||'');
  const db = loadDB();
  const p = (db.products||[]).find(x=>x.id===id);
  if(!p) return res.json({url:null});
  // Placeholder logic: if product 'source' is affiliate, build outbound URL with tag
  let url = null;
  if(p.source && p.source.startsWith('amazon:')){
    const asin = p.source.split(':')[1];
    const tag = (db.feeds||[]).find(f=>f.type==='amazon_affiliate')?.tag || 'findeasy-20';
    url = `https://www.amazon.com/dp/${asin}/?tag=${encodeURIComponent(tag)}`;
  } else if(p.source && p.source.startsWith('booking:')){
    const hid = p.source.split(':')[1];
    const pid = (db.feeds||[]).find(f=>f.type==='booking_affiliate')?.partnerId || 'XXXX';
    url = `https://www.booking.com/hotel/${hid}.html?aid=${encodeURIComponent(pid)}`;
  }
  // log click
  db.redirects = db.redirects || [];
  db.redirects.push({ id:'clk_'+nanoid(8), productId:id, at: Date.now(), url });
  saveDB(db);
  res.json({ url });
});

// --- Admin: settings
app.get('/api/admin/settings', requireAdmin, (req,res)=> res.json(loadDB().settings||{}));
app.post('/api/admin/settings', requireAdmin, (req,res)=>{
  const schema = Joi.object({ dynamic_pricing_enabled:Joi.boolean(), default_commission:Joi.number().min(0).max(1), min_commission:Joi.number().min(0).max(1), deals_enabled:Joi.boolean() });
  const { error, value } = schema.validate(req.body||{}); if(error) return res.status(400).json({error:error.message});
  const db = loadDB(); db.settings = Object.assign(db.settings||{}, value); saveDB(db); res.json({ok:true, settings: db.settings});
});

// --- Admin: Feeds
app.get('/api/admin/feeds', requireAdmin, (req,res)=> res.json(loadDB().feeds||[]));
app.post('/api/admin/feeds/connect', requireAdmin, (req,res)=>{
  const schema = Joi.object({ type:Joi.string().valid('shopify','woocommerce','amazon_affiliate','booking_affiliate').required(), baseUrl:Joi.string().allow(''), tag:Joi.string().allow(''), partnerId:Joi.string().allow('') });
  const { error, value } = schema.validate(req.body||{}); if(error) return res.status(400).json({error:error.message});
  const db = loadDB();
  const id = (value.type + '_' + nanoid(6));
  const feed = { id, ...value, active:true, lastPull:null };
  db.feeds = db.feeds || []; db.feeds.push(feed); saveDB(db);
  res.json({ok:true, feed});
});

// Pull feeds (mock ETL)
app.post('/api/admin/feeds/pull', requireAdmin, async (req,res)=>{
  const db = loadDB();
  const feeds = db.feeds || [];
  // For demo: for each active feed, push 2 mock products
  feeds.filter(f=>f.active).forEach((f,idx)=>{
    const baseId = f.type.slice(0,3).toUpperCase();
    const prodA = { id:`prd_${baseId}_${nanoid(6)}`, title:`${f.type} Product A`, price: Math.round(500 + Math.random()*3000), seller: f.type+'_seller', image:'https://picsum.photos/seed/'+nanoid(4)+'/600/400', source: f.type };
    const prodB = { id:`prd_${baseId}_${nanoid(6)}`, title:`${f.type} Product B`, price: Math.round(500 + Math.random()*3000), seller: f.type+'_seller', image:'https://picsum.photos/seed/'+nanoid(4)+'/600/400', source: f.type };
    db.products.push(prodA, prodB);
    f.lastPull = new Date().toISOString();
  });
  saveDB(db);
  res.json({ok:true, added:true, count: (feeds.filter(f=>f.active).length*2)});
});

// --- PSP routing (placeholder): choose TR or Global
const checkoutSchema = Joi.object({
  items: Joi.array().items(Joi.object({ id:Joi.string().allow(''), title:Joi.string().required(), price:Joi.number().required(), seller:Joi.string().required(), image:Joi.string().allow('') })).min(1).required(),
  currency: Joi.string().default('TRY'),
  customer: Joi.object({ email:Joi.string().email().required(), country:Joi.string().length(2).uppercase().required() }).required()
});
app.post('/api/checkout', (req,res)=>{
  const { error, value } = checkoutSchema.validate(req.body||{}); if(error) return res.status(400).json({error:error.message});
  const { items, currency, customer } = value;
  const db = loadDB();
  const orderId = 'ord_'+nanoid(10);
  const amount = items.reduce((a,b)=> a + Number(b.price||0), 0);
  const isTR = customer.country === 'TR';
  const psp = isTR ? 'iyzico/paytr' : 'stripe';
  db.orders.push({ id:orderId, items, amount, currency, customer, psp, status:'CREATED' });
  saveDB(db);
  // Return which PSP would be used (integration endpoint to be wired with real keys)
  res.json({ ok:true, orderId, amount, currency, psp });
});

// Webhooks (stubs)
app.post('/api/webhooks/iyzico', (req,res)=>{ console.log('iyzico webhook', req.body); res.sendStatus(200); });
app.post('/api/webhooks/paytr', (req,res)=>{ console.log('paytr webhook', req.body); res.sendStatus(200); });
app.post('/api/webhooks/stripe', (req,res)=>{ console.log('stripe webhook', req.body); res.sendStatus(200); });

// Health
app.get('/healthz',(req,res)=>res.json({ok:true}));

// Error handler
app.use((err,req,res,next)=>{ console.error('Error:', err.message); res.status(500).json({error:'internal_error'}); });

app.listen(PORT, ()=> console.log('FindEasy v1.2 listening on http://localhost:'+PORT));
