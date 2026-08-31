import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

export const DocTypeSchema = z.enum([
  "quotation",
  "invoice",
  "po",
  "proforma",
  "delivery",
  "receipt",
]);

const nullableString = z.string().trim().optional().nullable();

const JsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonSchema),
    z.record(JsonSchema),
  ]),
);

const StatusSchema = z.enum(["draft", "pending", "approved", "rejected"]);

const LineItemSchema = z.object({
  key: z.string().trim().min(1),
  productId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  qty: z.coerce.number().nonnegative(),
  rate: z.coerce.number().nonnegative(),
  taxPct: z.coerce.number().nonnegative(),
  unit: z.string().trim().optional().nullable(),
});

const BankDetailsSchema = z
  .object({
    accountName: z.string().trim().optional(),
    accountNumber: z.string().trim().optional(),
    bankName: z.string().trim().optional(),
    branch: z.string().trim().optional(),
    ifsc: z.string().trim().optional(),
    iban: z.string().trim().optional(),
  })
  .optional()
  .nullable();

export const QuotationCreateSchema = z.object({
  id: z.string().trim().optional(),
  invoice_number: z.string().trim().min(1),
  doc_type: DocTypeSchema.optional().default("quotation"),
  status: StatusSchema.optional().default("draft"),
  issue_date: z.string().trim().optional(),
  due_date: z.string().trim().optional().nullable(),
  business_name: nullableString,
  business_phone: nullableString,
  business_address: nullableString,
  business_logo_url: nullableString,
  client_name: z.string().trim().min(1),
  client_phone: nullableString,
  client_email: z.string().email().optional().nullable(),
  client_address: nullableString,
  items: z.array(LineItemSchema).optional().default([]),
  subtotal: z.coerce.number().nonnegative().optional().default(0),
  tax_rate: z.coerce.number().nonnegative().optional().default(0),
  tax_amount: z.coerce.number().nonnegative().optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
  total: z.coerce.number().nonnegative().optional().default(0),
  currency: z.string().trim().optional().default("PKR"),
  notes: nullableString,
  terms: nullableString,
  bank_details: BankDetailsSchema,
  signature_name: nullableString,
});

export const QuotationUpdateSchema = z.object({
  invoice_number: z.string().trim().min(1).optional(),
  doc_type: DocTypeSchema.optional(),
  status: StatusSchema.optional(),
  issue_date: z.string().trim().optional(),
  due_date: z.string().trim().optional().nullable(),
  business_name: nullableString,
  business_phone: nullableString,
  business_address: nullableString,
  business_logo_url: nullableString,
  client_name: z.string().trim().min(1).optional(),
  client_phone: nullableString,
  client_email: z.string().email().optional().nullable(),
  client_address: nullableString,
  items: z.array(LineItemSchema).optional(),
  subtotal: z.coerce.number().nonnegative().optional(),
  tax_rate: z.coerce.number().nonnegative().optional(),
  tax_amount: z.coerce.number().nonnegative().optional(),
  discount: z.coerce.number().nonnegative().optional(),
  total: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().optional(),
  notes: nullableString,
  terms: nullableString,
  bank_details: BankDetailsSchema,
  signature_name: nullableString,
});

export const ClientCreateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email().optional().nullable(),
  phone: nullableString,
  address: nullableString,
  company: nullableString,
  notes: nullableString,
});

export const ClientUpdateSchema = ClientCreateSchema.partial();

export const ProfileUpdateSchema = z.object({
  name: z.string().trim().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: nullableString,
});

export const InvoiceCreateSchema = QuotationCreateSchema.extend({
  doc_type: z.literal("invoice").optional().default("invoice"),
});

export const InvoiceUpdateSchema = QuotationUpdateSchema.extend({
  doc_type: z.literal("invoice").optional(),
});

export const PaginationQuerySchema = z.object({
  limit: z.preprocess((value) => {
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().int().positive().max(200).default(50)),
  offset: z.preprocess((value) => {
    if (typeof value === "string") return Number(value);
    return value;
  }, z.number().int().nonnegative().default(0)),
  type: DocTypeSchema.optional(),
  status: z.string().trim().optional(),
});
