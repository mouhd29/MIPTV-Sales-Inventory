'use client';
import {useEffect,useRef,useState} from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
export default function CustomerCodeLabel({code,name,barcode}:{code:string;name:string;barcode:string}){
 const ref=useRef<SVGSVGElement>(null),[qr,setQr]=useState('');
 useEffect(()=>{if(ref.current)try{JsBarcode(ref.current,barcode,{format:'CODE128',displayValue:true,width:2,height:65,margin:8});}catch{};QRCode.toDataURL('MIPTV CUSTOMER: '+code+' | BARCODE: '+barcode,{width:180,margin:1}).then(setQr).catch(()=>{});},[code,barcode]);
 const print=()=>{const svg=ref.current?.outerHTML||'';const win=window.open('','_blank');if(!win)return;const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));win.document.write('<html><head><title>Customer ID</title><style>body{font:14px Arial;text-align:center;padding:30px;color:#123455}img{width:130px}svg{max-width:100%}h2{color:#078e57}@media print{button{display:none}}</style></head><body><h2>MIPTV Customer Identification</h2><h3>'+escape(name)+'</h3><p>'+escape(code)+'</p>'+svg+'<p><img src="'+qr+'"/></p><p>Customer QR & Barcode</p><button onclick="window.print()">Print Label</button></body></html>');win.document.close();};
 return <div style={{textAlign:'center',padding:16}}><h3>{name}</h3><p>Customer code: {code}</p><svg ref={ref}/>{qr&&<div><img src={qr} alt="Customer QR" width={125} height={125}/></div>}<button onClick={print} style={{background:'#078e57',color:'white',border:0,borderRadius:8,padding:'10px 18px',marginTop:12}}>Print Customer Barcode / QR</button></div>;
}
