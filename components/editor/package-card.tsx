import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check, Clock, RefreshCw, Video, FileArchive, Briefcase } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PackageCardProps {
  id: string;
  title: string;
  description: string;
  price: number; // paise
  deliveryDays: number;
  revisionCount: number;
  videoLengthLimit?: string | null;
  videoCount?: number;
  includesSourceFiles?: boolean;
  includesCommercialRights?: boolean;
  showBookButton?: boolean;
  isLoggedIn?: boolean;
}

export function PackageCard({
  id,
  title,
  description,
  price,
  deliveryDays,
  revisionCount,
  videoLengthLimit,
  videoCount = 1,
  includesSourceFiles = false,
  includesCommercialRights = false,
  showBookButton = false,
  isLoggedIn = false,
}: PackageCardProps) {
  const bookHref = isLoggedIn ? `/checkout/${id}` : "/login";

  const features: { icon: React.ElementType; label: string; highlight?: boolean }[] = [
    {
      icon: Clock,
      label: `${deliveryDays} day${deliveryDays !== 1 ? "s" : ""} delivery`,
    },
    {
      icon: RefreshCw,
      label: revisionCount === -1
        ? "Unlimited revisions"
        : `${revisionCount} revision${revisionCount !== 1 ? "s" : ""}`,
    },
    {
      icon: Video,
      label: videoCount === 1
        ? `1 video${videoLengthLimit ? ` · ${videoLengthLimit}` : ""}`
        : `${videoCount} videos${videoLengthLimit ? ` · ${videoLengthLimit}` : ""}`,
    },
    {
      icon: FileArchive,
      label: "Source files included",
      highlight: includesSourceFiles,
    },
    {
      icon: Briefcase,
      label: "Commercial use rights",
      highlight: includesCommercialRights,
    },
    {
      icon: Check,
      label: "Escrow-protected payment",
      highlight: true,
    },
  ];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <h3 className="font-semibold text-lg leading-tight">{title}</h3>
        <p className="text-3xl font-bold">{formatCurrency(price)}</p>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <div className="space-y-2 mb-6 flex-1">
          {features.map(({ icon: Icon, label, highlight }) => (
            highlight === false ? null : (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Icon className={cn(
                  "w-4 h-4 shrink-0",
                  highlight ? "text-emerald-500" : "text-muted-foreground"
                )} />
                <span className={highlight ? "text-gray-800 font-medium" : "text-gray-600"}>
                  {label}
                </span>
              </div>
            )
          ))}
        </div>
        {showBookButton && (
          <Link
            href={bookHref}
            className={cn(buttonVariants(), "w-full bg-[var(--brand-client)] hover:bg-[var(--brand-client-hover)] justify-center")}
          >
            Book Now
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
