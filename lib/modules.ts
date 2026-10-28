export const sections = [
{title:'Home',items:['Dashboard','Address Book','My Tasks']},
{title:'Accounts',items:['Customer List','Prospect List','Supplier List','Sales Leads']},
{title:'Inventory',items:['Inventory List','Stock Transfers','Kitting & Bundling','Manage Categories','Manage Attributes','Locations & Zones']},
{title:'Documents',items:['Sales Orders','Purchase Orders','Estimates','Sales Invoices']},
{title:'Reports',items:['Sales Report','Purchase Report','Inventory Report']},
{title:'Administration',items:['Settings','Users & Roles']}
] as const;
export const entities:Record<string,{table:string;columns:string[];labels:string[]}> = {
'Address Book':{table:'address_book',columns:['code','name','email','phone','address'],labels:['Code','Name','Email','Phone','Address']},
'My Tasks':{table:'tasks',columns:['title','assigned_to','due_date','status','notes'],labels:['Title','Assigned To','Due Date','Status','Notes']},
'Prospect List':{table:'prospects',columns:['code','name','email','phone','status'],labels:['Code','Name','Email','Phone','Status']},
'Sales Leads':{table:'sales_leads',columns:['code','customer_code','description','estimated_value','status'],labels:['Code','Customer Code','Description','Estimated Value','Status']},
'Stock Transfers':{table:'stock_transfers',columns:['reference','sku','from_location','to_location','quantity','date'],labels:['Reference','SKU','From','To','Quantity','Date']},
'Kitting & Bundling':{table:'kits',columns:['kit_sku','name','component_sku','component_quantity'],labels:['Kit SKU','Name','Component SKU','Component Quantity']},
'Manage Categories':{table:'inventory_categories',columns:['code','name','description'],labels:['Code','Name','Description']},
'Manage Attributes':{table:'inventory_attributes',columns:['code','name','value'],labels:['Code','Name','Value']},
'Locations & Zones':{table:'inventory_locations',columns:['code','name','zone','address'],labels:['Code','Name','Zone','Address']},
'Estimates':{table:'estimates',columns:['number','customer_code','date','status','total'],labels:['Estimate #','Customer Code','Date','Status','Total']},
'Customer List':{table:'customers',columns:['code','name','email','phone','address'],labels:['Code','Name','Email','Phone','Address']},
'Supplier List':{table:'suppliers',columns:['code','name','email','phone','address'],labels:['Code','Name','Email','Phone','Address']},
'Inventory List':{table:'items',columns:['sku','name','category','unit','cost','price','quantity'],labels:['SKU','Name','Category','Unit','Cost','Price','Quantity']},
'Sales Orders':{table:'sales_orders',columns:['number','customer_code','date','status','total'],labels:['Order #','Customer Code','Date','Status','Total']},
'Sales Invoices':{table:'sales_invoices',columns:['number','customer_code','date','status','total'],labels:['Invoice #','Customer Code','Date','Status','Total']},
'Purchase Orders':{table:'purchase_orders',columns:['number','supplier_code','date','status','total'],labels:['PO #','Supplier Code','Date','Status','Total']}
};
