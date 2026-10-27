export const sections = [
{title:'Home',items:['Dashboard','Address Book','My Tasks']},
{title:'Accounts',items:['Customer List','Prospect List','Supplier List','Sales Leads']},
{title:'Inventory',items:['Inventory List','Stock Transfers','Kitting & Bundling','Manage Categories','Manage Attributes','Locations & Zones']},
{title:'Documents',items:['Sales Orders','Purchase Orders','Estimates','Sales Invoices']},
{title:'Reports',items:['Sales Report','Purchase Report','Inventory Report']},
{title:'Administration',items:['Settings','Users & Roles']}
] as const;
export const entities:Record<string,{table:string;columns:string[];labels:string[]}> = {
'Customer List':{table:'customers',columns:['code','name','email','phone','address'],labels:['Code','Name','Email','Phone','Address']},
'Supplier List':{table:'suppliers',columns:['code','name','email','phone','address'],labels:['Code','Name','Email','Phone','Address']},
'Inventory List':{table:'items',columns:['sku','name','category','unit','cost','price','quantity'],labels:['SKU','Name','Category','Unit','Cost','Price','Quantity']},
'Sales Orders':{table:'sales_orders',columns:['number','customer_code','date','status','total'],labels:['Order #','Customer Code','Date','Status','Total']},
'Sales Invoices':{table:'sales_invoices',columns:['number','customer_code','date','status','total'],labels:['Invoice #','Customer Code','Date','Status','Total']},
'Purchase Orders':{table:'purchase_orders',columns:['number','supplier_code','date','status','total'],labels:['PO #','Supplier Code','Date','Status','Total']}
};
