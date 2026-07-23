export type UserRole =
  | "client"
  | "editor"
  | "admin"
  | "staff_kyc"
  | "staff_support"
  | "staff_dispute"
  | "staff_moderation";

export type KYCStatus = "pending" | "approved" | "rejected" | "expired";

export type OrderStatus =
  | "pending"
  | "in_progress"
  | "delivered"
  | "revision_requested"
  | "completed"
  | "disputed"
  | "cancelled";


export type DisputeStatus = "open" | "resolved";

export type ResolutionType = "refund" | "release" | "split";

export type PayoutStatus = "pending" | "processing" | "completed";

export type PortfolioItemType = "video" | "image";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: UserRole;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Editor {
  id: string;
  userId: string;
  bio: string | null;
  avgResponseTime: number | null;
  completionRate: number | null;
  totalOrders: number;
  kycStatus: KYCStatus;
  kycRejectionReason: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface KYCApplication {
  id: string;
  editorId: string;
  documentType: string;
  documentUrl: string;
  selfieUrl: string | null;
  status: KYCStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Package {
  id: string;
  editorId: string;
  tier: string | null;
  title: string;
  description: string;
  price: number; // stored in paise
  deliveryDays: number;
  revisionCount: number;
  videoLengthLimit: string | null;
  videoCount: number;
  videoCategory: string | null;
  videoFormat: string | null;
  resolution: string | null;
  aspectRatios: string[];
  addons: string[];
  softwareUsed: string[];
  maxRawFootage: string | null;
  deliveryFormats: string[];
  includesSourceFiles: boolean;
  includesCommercialRights: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  clientId: string;
  editorId: string;
  packageId: string;
  status: OrderStatus;
  totalAmount: number; // paise
  commissionAmount: number; // paise
  brief: string;
  deadline: Date | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Delivery {
  id: string;
  orderId: string;
  versionNumber: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: Date;
}

export interface RevisionRequest {
  id: string;
  orderId: string;
  deliveryId: string | null;
  feedbackText: string;
  requestedBy: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  orderId: string;
  senderId: string;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
  createdAt: Date;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  role: "client" | "editor";
  rating: number;
  text: string | null;
  replyText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dispute {
  id: string;
  orderId: string;
  openedBy: string;
  reason: string;
  evidenceText: string | null;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolutionType: ResolutionType | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payout {
  id: string;
  editorId: string;
  orderId: string;
  grossAmount: number; // paise
  commissionAmount: number; // paise
  netAmount: number; // paise
  razorpayTransferId: string | null;
  status: PayoutStatus;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Enriched types used in page components
export interface EditorWithDetails extends Editor {
  user: User;
  skills: { id: string; name: string }[];
  tools: { id: string; name: string }[];
  portfolioItems: {
    id: string;
    type: PortfolioItemType;
    url: string;
    title: string | null;
  }[];
  packages: Package[];
  reviews: ReviewWithReviewer[];
  averageRating: number;
}

export interface ReviewWithReviewer extends Review {
  reviewer: Pick<User, "id" | "name">;
}

export interface OrderWithDetails extends Order {
  client: Pick<User, "id" | "name" | "image">;
  editor: Pick<User, "id" | "name" | "image">;
  package: Package;
  deliveries: Delivery[];
  revisionRequests: RevisionRequest[];
  dispute: Dispute | null;
}
