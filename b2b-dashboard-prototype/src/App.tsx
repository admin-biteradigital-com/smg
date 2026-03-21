import { useState } from "react";
import { 
  Building2, 
  Package, 
  Users, 
  FileText, 
  Settings, 
  Search, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck,
  ChevronRight,
  LogOut,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Mock Data
const PENDING_LEADS = [
  { id: "L-9021", name: "Kiosco El Milagro", contact: "Juan Pérez", type: "Kiosco", time: "2h ago", risk: "Low" },
  { id: "L-9022", name: "Minimarket La Familia", contact: "Ana Silva", type: "Minimarket", time: "5h ago", risk: "Medium" },
  { id: "L-9023", name: "Almacén Central Sur", contact: "Carlos Rozas", type: "Almacén", time: "1d ago", risk: "High" },
];

const INVENTORY = [
  { sku: "SKU-10045", name: "Alfajor Triple Chocolate", stock: 1250, price: 850, status: "In Stock" },
  { sku: "SKU-10046", name: "Gomitas Ácidas 500g", stock: 85, price: 1200, status: "Low Stock" },
  { sku: "SKU-10047", name: "Barra Cereal Maní", stock: 0, price: 450, status: "Out of Stock" },
  { sku: "SKU-10048", name: "Chocolate Rama Fino", stock: 430, price: 2100, status: "In Stock" },
  { sku: "SKU-10049", name: "Galletas Vainilla Pack", stock: 2200, price: 900, status: "In Stock" },
  { sku: "SKU-10050", name: "Caramelos Menta 1kg", stock: 15, price: 3500, status: "Low Stock" },
  { sku: "SKU-10051", name: "Combo Cumpleaños", stock: 40, price: 15000, status: "In Stock" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("leads");

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      
      {/* Sidebar - Asymmetric dense nav */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-extrabold tracking-tighter text-primary uppercase">SMG Terminal</h1>
            <p className="text-xs text-muted-foreground tabular-data mt-1">SYS.OP V2.0.4 // B2B</p>
          </div>
          <nav className="p-4 space-y-1">
            <SidebarItem icon={Users} label="Pending Leads" active={activeTab === "leads"} onClick={() => setActiveTab("leads")} count={3} />
            <SidebarItem icon={Package} label="B2B Catalog" active={activeTab === "catalog"} onClick={() => setActiveTab("catalog")} />
            <SidebarItem icon={Truck} label="Dispatch Queue" />
            <SidebarItem icon={FileText} label="Invoices" />
            <SidebarItem icon={Building2} label="Clients CRM" />
          </nav>
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 rounded-md p-2 bg-muted/50">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">Admin Operator</p>
              <p className="text-xs text-muted-foreground truncate">admin@smg.cl</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Button>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="mr-2 h-4 w-4" /> Terminate Session
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center w-full max-w-md">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input 
              type="text" 
              placeholder="Search SKUs, Leads, or Invoices…" 
              className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm tabular-data text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              SYSTEM NOMINAL
            </div>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Main Console</h2>
                <p className="text-muted-foreground">Real-time B2B operations matrix.</p>
              </div>
              <p className="text-sm tabular-data text-muted-foreground text-right hidden sm:block">
                {new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())}
              </p>
            </div>

            {/* Metrics Ticker */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard title="Leads Pending Verification" value="03" trend="+2 since yesterday" alert />
              <MetricCard title="Active B2B Orders" value="142" trend="Nominal volume" />
              <MetricCard title="Items Out of Stock" value="1" trend="Action required" warning />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="leads" className="font-bold">Pending Leads Queue</TabsTrigger>
                <TabsTrigger value="catalog" className="font-bold">Live Inventory Match</TabsTrigger>
              </TabsList>

              <TabsContent value="leads" className="space-y-4 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {PENDING_LEADS.map((lead) => (
                    <Card key={lead.id} className="group hover:-translate-y-1 transition-transform duration-200 border-border bg-card">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="tabular-data border-primary text-primary">{lead.id}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> {lead.time}
                          </span>
                        </div>
                        <CardTitle className="mt-2 text-lg truncate">{lead.name}</CardTitle>
                        <CardDescription className="truncate">Contact: {lead.contact}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm mb-4">
                          <span className="text-muted-foreground">Type: <span className="text-foreground font-semibold">{lead.type}</span></span>
                          <span className="text-muted-foreground">Risk: <span className={lead.risk === "High" ? "text-destructive font-bold" : "text-foreground font-semibold"}>{lead.risk}</span></span>
                        </div>
                        <div className="flex gap-2">
                          <Button className="w-full" variant="default">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                          </Button>
                          <Button size="icon" variant="outline" className="shrink-0 hover:border-destructive hover:text-destructive hover:bg-destructive/10">
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="catalog" className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <Card className="border-border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-[120px]">SKU</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">B2B Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {INVENTORY.map((item) => (
                        <TableRow key={item.sku} className="border-border hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium tabular-data text-muted-foreground">{item.sku}</TableCell>
                          <TableCell className="font-bold truncate max-w-[200px] sm:max-w-none">{item.name}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                item.status === "In Stock" ? "border-secondary text-secondary" : 
                                item.status === "Low Stock" ? "border-primary text-primary" : 
                                "border-destructive text-destructive"
                              }
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-data font-bold">
                            {item.stock}
                          </TableCell>
                          <TableCell className="text-right tabular-data text-muted-foreground">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.price)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>

          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick, count }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
        active 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <div className="flex items-center">
        <Icon className="mr-3 h-4 w-4" />
        <span className="truncate">{label}</span>
      </div>
      {count && (
        <span className={`tabular-data text-xs py-0.5 px-2 rounded-full ${active ? "bg-background/20" : "bg-primary text-primary-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function MetricCard({ title, value, trend, alert, warning }: any) {
  return (
    <Card className={`border-border ${alert ? 'border-primary shadow-[0_0_15px_rgba(255,85,0,0.15)] bg-card' : 'bg-card'}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
        {alert && <AlertTriangle className="w-4 h-4 text-primary" />}
        {warning && <AlertTriangle className="w-4 h-4 text-destructive" />}
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-extrabold tabular-data ${alert ? 'text-primary' : ''}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </CardContent>
    </Card>
  );
}
