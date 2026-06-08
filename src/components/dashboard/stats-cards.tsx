import { Package, Truck, Clock, Weight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Total Collections",
      value: stats.total_collections.toLocaleString(),
      icon: Package,
      color: "bg-[#071A3A]",
      textColor: "text-[#071A3A]",
      bgLight: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Today's Collections",
      value: stats.today_collections.toLocaleString(),
      icon: Truck,
      color: "bg-[#E67A32]",
      textColor: "text-[#E67A32]",
      bgLight: "bg-orange-50 dark:bg-orange-950",
    },
    {
      label: "Pending Deliveries",
      value: stats.pending_deliveries.toLocaleString(),
      icon: Clock,
      color: "bg-purple-600",
      textColor: "text-purple-600",
      bgLight: "bg-purple-50 dark:bg-purple-950",
    },
    {
      label: "Total Weight (KG)",
      value: stats.total_weight.toLocaleString("en", {
        maximumFractionDigits: 0,
      }),
      icon: Weight,
      color: "bg-green-600",
      textColor: "text-green-600",
      bgLight: "bg-green-50 dark:bg-green-950",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {card.label}
                </p>
                <p className={`text-3xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
              </div>
              <div className={`${card.bgLight} p-3 rounded-xl`}>
                <card.icon className={`h-6 w-6 ${card.textColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Cargo type breakdown mini cards
export function CargoBreakdown({ stats }: StatsCardsProps) {
  const types = [
    { label: "Air Freight", value: stats.by_cargo_type.air, color: "bg-sky-500" },
    { label: "Sea Freight", value: stats.by_cargo_type.sea, color: "bg-blue-700" },
    { label: "Land Freight", value: stats.by_cargo_type.land, color: "bg-[#E67A32]" },
  ];

  const total = Object.values(stats.by_cargo_type).reduce((a, b) => a + b, 0) || 1;

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Cargo Type Breakdown</p>
        <div className="space-y-3">
          {types.map((type) => (
            <div key={type.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">{type.label}</span>
                <span className="font-semibold">{type.value}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${type.color} rounded-full transition-all`}
                  style={{ width: `${(type.value / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
