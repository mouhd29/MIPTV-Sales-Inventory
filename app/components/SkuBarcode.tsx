'use client';
import {useEffect,useRef} from 'react';
import JsBarcode from 'jsbarcode';
export default function SkuBarcode({sku,name,price}:{sku:string;name:string;price:number}){
 const ref=useRef<SVGSVGElement>(null);
 useEffect(()=>{if(ref.current){try{JsBarcode(ref.current,sku,{format:'CODE128',width:2,height:65,displayValue:true,fontSize:14,margin:8});}catch{ref.current.textContent='Unable to encode this SKU';}}},[sku]);
 const print=()=>{const svg=ref.current?.outerHTML||'';const w=window.open('','_blank');if(!w)return;const safe=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));w.document.write('<html><head><title>Barcode '+safe(sku)+'</title><style>body{font:14px Arial;text-align:center;margin:35px}svg{max-width:100%;height:auto}@media print{button{display:none}}</style></head><body><h3>'+safe(name)+'</h3>'+svg+'<p>SKU: '+safe(sku)+' · Price: '+Number(price).toFixed(3)+' KWD</p><button onclick="window.print()">Print Label</button></body></html>');w.document.close();w.focus();};
 return <div style={{textAlign:'center',padding:15,background:'white',border:'1px solid #e4e9f2',borderRadius:12}}><h3 style={{margin:'0 0 10px'}}>{name}</h3><svg ref={ref} aria-label={'Code128 barcode for '+sku}/><p>SKU: {sku} · {Number(price).toFixed(3)} KWD</p><button onClick={print} style={{padding:'9px 15px',border:'1px solid #d4dce8',borderRadius:8,cursor:'pointer'}}>Print Barcode Label / PDF</button></div>;
}
