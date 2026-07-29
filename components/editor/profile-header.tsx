import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, CheckCircle, ShoppingBag } from "lucide-react";
import { displayNameFromFull, formatDate } from "@/lib/utils";

interface ProfileHeaderProps {
  name: string | null;
  image: string | null;
  skills: string[];
  avgRating: number | null;
  reviewCount: number;
  totalOrders: number;
  completionRate: number | null;
  avgResponseTime: number | null;
  createdAt: Date | string;
  action?: React.ReactNode;
}

export function ProfileHeader({
  name,
  image,
  skills,
  avgRating,
  reviewCount,
  totalOrders,
  completionRate,
  avgResponseTime,
  createdAt,
  action,
}: ProfileHeaderProps) {
  const displayedName = displayNameFromFull(name);
  const initials = displayedName.slice(0, 2).toUpperCase();
  const responseLabel = avgResponseTime
    ? avgResponseTime < 60
      ? `${avgResponseTime}m`
      : `${Math.round(avgResponseTime / 60)}h`
    : "—";

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <Avatar className="w-24 h-24 shrink-0">
        <AvatarImage src={image ?? undefined} alt={displayedName} />
        <AvatarFallback className="text-2xl font-bold bg-[var(--brand-client)] text-white">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">{displayedName}</h1>
          <Badge className="bg-green-100 text-green-700 border-0 text-xs">KYC Verified</Badge>
        </div>

        {skills[0] && <p className="text-muted-foreground mb-2">{skills[0]}</p>}

        <div className="flex items-center gap-1 mb-3">
          {avgRating !== null ? (
            <>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-semibold">{avgRating}</span>
              <span className="text-sm text-muted-foreground">({reviewCount} reviews)</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No reviews yet</span>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Avg. response {responseLabel}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            {completionRate ?? "—"}% completion
          </span>
          <span className="flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            {totalOrders} orders
          </span>
          <span>Member since {formatDate(createdAt)}</span>
        </div>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
