"use client";

import React, {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/helpers/classname-helper";
import { Check, Loader2, QrCode, ShieldCheck, Printer, Download, Sparkles, Lock, FileText } from "lucide-react";
import { maskPin } from "@/lib/masking";

export type ReceiptPrinterStage = "processing" | "printing" | "complete";
export type ReceiptFeedMotion = "smooth" | "stepped";

export type ReceiptPrinterRootProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> & {
  /** Disables all stage transitions when false. */
  animate?: boolean;
  children: ReactNode;
  /** Controls whether the paper feeds continuously or one line at a time. */
  feedMotion?: ReceiptFeedMotion;
  /** Current state of the printer. */
  stage: ReceiptPrinterStage;
};

export type ReceiptPrinterMachineProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterHeaderProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterScreenProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterOutputProps = ComponentPropsWithoutRef<"div">;
export type ReceiptPrinterPaperProps = ComponentPropsWithoutRef<"article">;

export type ReceiptPrinterStatusProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  /** Custom status content. Defaults to a label derived from the current stage. */
  children?: ReactNode;
};

type ReceiptPrinterContextValue = {
  animate: boolean;
  feedMotion: ReceiptFeedMotion;
  shouldMove: boolean;
  stage: ReceiptPrinterStage;
};

const ReceiptPrinterContext = createContext<ReceiptPrinterContextValue | null>(null);

const easeOut = [0.23, 1, 0.32, 1] as const;
const easeInOut = [0.77, 0, 0.175, 1] as const;

const receiptToothCount = 40;
const receiptToothDepth = 4;
const receiptToothPoints = Array.from(
  { length: receiptToothCount * 2 },
  (_, index) => {
    const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
    const y = index % 2 === 0 ? "100%" : `calc(100% - ${receiptToothDepth}px)`;

    return `${x}% ${y}`;
  },
).join(", ");
export const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

export const printingTransformKeyframes = [
  "translateY(-100%)",
  "translateY(-91%)",
  "translateY(-91%)",
  "translateY(-81%)",
  "translateY(-81%)",
  "translateY(-70%)",
  "translateY(-70%)",
  "translateY(-58%)",
  "translateY(-58%)",
  "translateY(-45%)",
  "translateY(-45%)",
  "translateY(-32%)",
  "translateY(-32%)",
  "translateY(-20%)",
  "translateY(-20%)",
  "translateY(-10%)",
  "translateY(-10%)",
  "translateY(-3%)",
  "translateY(-3%)",
  "translateY(0%)",
];

export const printingYKeyframes = [
  "-100%",
  "-91%",
  "-91%",
  "-81%",
  "-81%",
  "-70%",
  "-70%",
  "-58%",
  "-58%",
  "-45%",
  "-45%",
  "-32%",
  "-32%",
  "-20%",
  "-20%",
  "-10%",
  "-10%",
  "-3%",
  "-3%",
  "0%",
];

export const printingKeyframeTimes = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6,
  0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1,
];

const statusLabels: Record<ReceiptPrinterStage, ReactNode> = {
  processing: "Verifying taxpayer security credentials...",
  printing: "Compiling official KRA certificate...",
  complete: "Compliance certificate ready for download",
};

export function CheckCircleIcon({ size = 18, className }: { size?: number; weight?: string; className?: string }) {
  return <Check style={{ width: size, height: size }} className={className} strokeWidth={2.75} />;
}

export function CircleNotchIcon({ size = 18, className }: { size?: number; weight?: string; className?: string }) {
  return <Loader2 style={{ width: size, height: size }} className={cn("animate-spin", className)} strokeWidth={2.5} />;
}

const machineClassName =
  "relative isolate w-full overflow-hidden rounded-[var(--printer-radius)] border border-outline-variant/80 bg-zinc-900 text-zinc-100 p-[var(--printer-inset)] pb-8 shadow-2xl shadow-black/40 [--printer-inner-radius:calc(var(--printer-radius)_-_var(--printer-inset))] [--printer-inset:0.75rem] [--printer-radius:1.5rem] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-[url('/textures/plastic-noise.svg')] before:bg-[length:180px_180px] before:bg-repeat before:opacity-30 before:mix-blend-multiply before:content-[''] dark:border-zinc-800 dark:bg-zinc-950";

export function useReceiptPrinter(component: string) {
  const context = useContext(ReceiptPrinterContext);

  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }

  return context;
}

export function ReceiptPrinterRoot({
  "aria-label": ariaLabel = "Receipt printer",
  animate = true,
  children,
  className,
  feedMotion = "stepped",
  stage,
  ...props
}: ReceiptPrinterRootProps) {
  const shouldReduceMotion = useReducedMotion();
  const context = {
    animate,
    feedMotion,
    shouldMove: animate,
    stage,
  };


  return (
    <ReceiptPrinterContext.Provider value={context}>
      <section
        aria-label={ariaLabel}
        className={cn(
          "relative isolate flex w-full max-w-md mx-auto flex-col items-center",
          className,
        )}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

export function ReceiptPrinterMachine({
  children,
  className,
  ...props
}: ReceiptPrinterMachineProps) {
  return (
    <div className={cn(machineClassName, className)} {...props}>
      {children}
      {/* Paper dispenser output slit */}
      <div
        aria-hidden="true"
        className="absolute inset-x-6 bottom-[var(--printer-inset)] z-40 h-2.5 rounded-[0.25rem] border border-zinc-950 bg-zinc-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] dark:border-zinc-900 dark:bg-black"
      />
    </div>
  );
}

export function ReceiptPrinterHeader({
  children,
  className,
  ...props
}: ReceiptPrinterHeaderProps) {
  return (
    <div
      className={cn(
        "relative z-10 flex h-11 items-center justify-between px-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ReceiptPrinterScreen({
  children,
  className,
  ...props
}: ReceiptPrinterScreenProps) {
  return (
    <div
      className={cn(
        "relative z-10 isolate overflow-hidden rounded-[var(--printer-inner-radius)] border border-zinc-800 bg-zinc-950/90 p-4 text-zinc-100 shadow-[inset_0_0_24px_rgba(0,0,0,0.85)]",
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function StatusIndicator({
  animate,
  move,
  stage,
}: {
  animate: boolean;
  move: boolean;
  stage: ReceiptPrinterStage;
}) {
  const isComplete = stage === "complete";

  return (
    <span
      aria-hidden="true"
      className="relative grid size-5 shrink-0 place-items-center"
    >
      <AnimatePresence initial={false} mode="sync">
        {isComplete ? (
          <motion.span
            animate={{ opacity: 1, transform: "scale(1)" }}
            className="col-start-1 row-start-1 grid place-items-center text-emerald-400"
            exit={{
              opacity: animate ? 0 : 1,
              transform: move ? "scale(0.96)" : "scale(1)",
            }}
            initial={{
              opacity: animate ? 0 : 1,
              transform: move ? "scale(0.94)" : "scale(1)",
            }}
            key="complete"
            transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
          >
            <CheckCircleIcon size={18} weight="fill" />
          </motion.span>
        ) : (
          <motion.span
            animate={{ opacity: 1, transform: "scale(1)" }}
            className="col-start-1 row-start-1 grid place-items-center text-red-400"
            exit={{
              opacity: animate ? 0 : 1,
              transform: move ? "scale(0.96)" : "scale(1)",
            }}
            initial={{
              opacity: animate ? 0 : 1,
              transform: move ? "scale(0.94)" : "scale(1)",
            }}
            key="working"
            transition={{ duration: animate ? 0.16 : 0, ease: easeOut }}
          >
            <CircleNotchIcon
              className={cn(
                animate && "animate-spin motion-reduce:animate-none",
              )}
              size={18}
              weight="bold"
            />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function ReceiptPrinterStatus({
  children,
  className,
  ...props
}: ReceiptPrinterStatusProps) {
  const { animate, shouldMove, stage } = useReceiptPrinter(
    "ReceiptPrinter.Status",
  );

  return (
    <div
      className={cn("flex min-w-0 items-center gap-2.5", className)}
      {...props}
    >
      <StatusIndicator animate={animate} move={shouldMove} stage={stage} />
      <div
        aria-live="polite"
        className="grid min-w-0 flex-1 items-center"
        role="status"
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            className="col-start-1 row-start-1 truncate font-medium text-xs text-zinc-300"
            exit={{
              opacity: animate ? 0 : 1,
              transform: shouldMove ? "translateY(-4px)" : "translateY(0px)",
            }}
            initial={{
              opacity: animate ? 0 : 1,
              transform: shouldMove ? "translateY(4px)" : "translateY(0px)",
            }}
            key={stage}
            transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}
          >
            {children ?? statusLabels[stage]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ReceiptPrinterPaper({
  children,
  className,
  style,
  ...props
}: ReceiptPrinterPaperProps) {
  return (
    <article
      className={cn(
        "relative z-10 min-h-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-6 pt-7 pb-8 font-mono text-zinc-900 dark:text-zinc-50 shadow-xl",
        className,
      )}
      style={{ clipPath: receiptClipPath, ...style }}
      {...props}
    >
      {children}
    </article>
  );
}

export function ReceiptPrinterOutput({
  children,
  className,
  ...props
}: ReceiptPrinterOutputProps) {
  const { animate, feedMotion, shouldMove, stage } = useReceiptPrinter(
    "ReceiptPrinter.Output",
  );
  const isReceiptVisible = stage !== "processing";
  const shouldUseSteppedFeed =
    feedMotion === "stepped" && stage === "printing" && shouldMove;

  return (
    <div
      className={cn(
        "relative z-50 -mt-4 w-[calc(90%+1.5rem)] max-w-full px-2 sm:px-4",
        stage === "complete" ? "overflow-visible min-h-fit" : "overflow-hidden min-h-[32rem]",
        className,
      )}
      {...props}
    >
      {isReceiptVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -top-1 z-20 h-2.5 bg-black/80 blur-[4px]"
        />
      ) : null}

      <motion.div
        animate={{
          opacity: isReceiptVisible ? 1 : 0,
          y:
            stage === "printing" && shouldMove
              ? shouldUseSteppedFeed
                ? printingYKeyframes
                : "0%"
              : isReceiptVisible || !shouldMove
                ? "0%"
                : "-100%",
        }}
        aria-hidden={stage !== "complete"}
        className="relative isolate before:pointer-events-none before:absolute before:inset-x-3 before:top-3 before:bottom-4 before:z-0 before:rounded-sm before:shadow-[0_8px_24px_rgba(0,0,0,0.25)] before:content-[''] after:pointer-events-none after:absolute after:right-[8%] after:bottom-0 after:left-[8%] after:z-0 after:h-3 after:translate-y-1.5 after:rounded-full after:bg-black/10 after:blur-lg after:content-['']"
        initial={{ y: "-100%", opacity: 0 }}
        transition={{
          opacity: { duration: animate ? 0.2 : 0, ease: easeOut },
          y: {
            duration: shouldMove ? 1.75 : 0,
            ease: shouldUseSteppedFeed ? "linear" : easeInOut,
            times: shouldUseSteppedFeed ? printingKeyframeTimes : undefined,
          },
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export const ReceiptPrinter = {
  Header: ReceiptPrinterHeader,
  Machine: ReceiptPrinterMachine,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
  Root: ReceiptPrinterRoot,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
};

/**
 * GovTech Prestige Tax Compliance Certificate & Official ETR Fiscal Invoice
 * Matches Kenya Revenue Authority standards and generated PDF fiscal receipt layout.
 */
export function TaxpayerCertificateReceiptContent({
  pin,
  name,
  idNumber,
  station,
  registeredDate,
  building,
  street,
  town,
  county,
  email,
  phoneNumber,
  isUnlocked = true,
  receiptNumber,
  paymentMethod = "M-PESA EXPRESS",
  amount = 20,
  onDownload,
  isDownloading = false,
  onDownloadReceipt,
  isDownloadingReceipt = false,
}: {
  pin: string;
  name: string;
  idNumber?: string;
  station?: string;
  registeredDate?: string;
  building?: string;
  street?: string;
  town?: string;
  county?: string;
  email?: string;
  phoneNumber?: string;
  isUnlocked?: boolean;
  receiptNumber?: string;
  paymentMethod?: string;
  amount?: number;
  onDownload?: () => void;
  isDownloading?: boolean;
  onDownloadReceipt?: () => void;
  isDownloadingReceipt?: boolean;
}) {
  const cleanReceipt = receiptNumber || "REC-" + (pin ? pin.slice(0, 4) : "2026") + "-ETR";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }) + " EAT";

  const numAmount = Number(amount || 20);
  const taxableAmt = (numAmount / 1.16).toFixed(2);
  const vatAmt = (numAmount - Number(taxableAmt)).toFixed(2);
  const resolvedAmount = numAmount.toFixed(2);

  return (
    <div className="space-y-3.5 text-xs font-mono text-zinc-900 dark:text-zinc-100">
      {/* 1. Official Fiscal Brand Header */}
      <div className="text-center border-b-2 border-dashed border-zinc-300 dark:border-zinc-700 pb-2.5">
        <div className="flex items-center justify-center gap-1.5 text-primary font-black text-xs tracking-wider uppercase">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>REPUBLIC OF KENYA</span>
        </div>
        <p className="text-[11px] font-black tracking-wide text-zinc-900 dark:text-zinc-100 uppercase mt-0.5">
          AKUBRECAH TECHNOLOGIES LTD
        </p>
        <p className="text-[9px] text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider">
          KRA COMPLIANCE & RETRIEVAL PORTAL
        </p>
        <p className="text-[10px] font-bold text-primary uppercase tracking-wide mt-0.5">
          OFFICIAL ETR FISCAL TAX INVOICE
        </p>
        <p className="text-[8px] text-zinc-500 font-mono mt-0.5">
          NAIROBI, KENYA | TEL: +254 791 497 858
        </p>
        <p className="text-[8px] font-mono text-zinc-600 dark:text-zinc-400 font-bold">
          PIN: P052184920K | VAT NO: 052184920K
        </p>
        <p className="text-[8px] font-mono text-zinc-500">
          DEVICE CU SERIAL: ACR-TIMS-2026-08426
        </p>

        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide">
          {isUnlocked ? (
            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3 text-emerald-600" /> DIGITAL FISCAL SEAL ACTIVE
            </span>
          ) : (
            <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 px-2 py-0.5 rounded-full">
              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> OFFICIAL RECORD · PAYMENT REQUIRED
            </span>
          )}
        </div>
      </div>

      {/* 2. Transaction Metadata */}
      <div className="space-y-1 text-[10px] border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
          <span>DATE: {dateStr}</span>
          <span>TIME: {timeStr}</span>
        </div>
        <div className="flex justify-between items-center font-bold">
          <span className="text-zinc-600 dark:text-zinc-400">RECEIPT NO:</span>
          <span className="text-zinc-900 dark:text-zinc-100 font-mono tracking-wider">{cleanReceipt}</span>
        </div>
        <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
          <span>CASHIER:</span>
          <span>JARVIS AUTO-BOT</span>
        </div>
      </div>

      {/* 3. Taxpayer / Buyer Details (Only Full Name & ID shown before payment) */}
      <div className="space-y-1.5 py-1 text-[11px] border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2.5">
        {/* Taxpayer Legal Name (Always visible) */}
        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] shrink-0">TAXPAYER:</span>
          <span className="font-bold text-right truncate max-w-[210px] uppercase text-zinc-900 dark:text-zinc-100">
            {name || "REGISTERED CITIZEN"}
          </span>
        </div>

        {/* National ID Number (Always visible) */}
        {idNumber && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] shrink-0">NATIONAL ID:</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{idNumber}</span>
          </div>
        )}

        {/* KRA PIN (Masked until paid) */}
        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] shrink-0">KRA PIN:</span>
          <span className="font-black text-primary font-mono tracking-wider">
            {isUnlocked ? (pin || "A012345678Z") : (maskPin(pin) || "A01*****78Z")}
          </span>
        </div>

        {/* Tax Station (Masked / blurred until paid) */}
        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] shrink-0">TAX STATION:</span>
          {isUnlocked ? (
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{station || "Eldoret TSO"}</span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-zinc-500">
              <span className="blur-xs select-none">••••••••••</span>
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">[LOCKED]</span>
            </span>
          )}
        </div>

        {/* Date Issued (Masked / blurred until paid) */}
        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] shrink-0">DATE ISSUED:</span>
          {isUnlocked ? (
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{registeredDate || "31/12/2012"}</span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-zinc-500">
              <span className="blur-xs select-none">••/••/••••</span>
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">[LOCKED]</span>
            </span>
          )}
        </div>

        {/* Location (Masked / blurred until paid) */}
        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] shrink-0">LOCATION:</span>
          {isUnlocked ? (
            <span className="text-right text-[10px] text-zinc-900 dark:text-zinc-100 max-w-[200px]">
              {[building, street, town || county].filter(Boolean).join(", ") || (town || county || "KAPENGURIA")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-zinc-500">
              <span className="blur-xs select-none">••••••••••••</span>
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">[LOCKED]</span>
            </span>
          )}
        </div>

        {/* Phone (Masked until paid) */}
        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] shrink-0">PHONE:</span>
          {isUnlocked ? (
            <span className="font-mono text-zinc-900 dark:text-zinc-100">{phoneNumber || "0791497858"}</span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-zinc-500">
              <span className="blur-xs select-none">••••••••••</span>
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">[LOCKED]</span>
            </span>
          )}
        </div>

        {/* Email (Masked until paid) */}
        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] shrink-0">EMAIL:</span>
          {isUnlocked ? (
            <span className="text-right text-[10px] text-zinc-900 dark:text-zinc-100 truncate max-w-[190px]">
              {email || "registered@akubrecah.com"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-zinc-500">
              <span className="blur-xs select-none">••••••••••</span>
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">[LOCKED]</span>
            </span>
          )}
        </div>
      </div>

      {/* 4. Line Items Table */}
      <div className="space-y-1 text-[10px] border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400 font-bold uppercase text-[9px]">
          <span>DESCRIPTION</span>
          <span>QTY  PRICE  TOTAL</span>
        </div>
        <div className="border-t border-dotted border-zinc-200 dark:border-zinc-800 pt-1 flex justify-between items-center font-bold">
          <span>KRA PIN CERTIFICATE</span>
          <span className="font-mono">1   {resolvedAmount}  {resolvedAmount}</span>
        </div>
        <p className="text-[8px] text-zinc-500 font-mono">* STATUTORY COMPLIANCE *</p>
      </div>

      {/* 5. Totals */}
      <div className="space-y-1 text-[10px] border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
          <span>SUBTOTAL (KES):</span>
          <span className="font-mono">{resolvedAmount}</span>
        </div>
        <div className="flex justify-between items-center font-black text-xs text-primary">
          <span>TOTAL PAID (KES):</span>
          <span className="font-mono">{resolvedAmount}</span>
        </div>
        <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
          <span>TENDERED ({paymentMethod}):</span>
          <span className="font-mono">{resolvedAmount}</span>
        </div>
        <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
          <span>CHANGE:</span>
          <span className="font-mono">0.00</span>
        </div>
      </div>

      {/* 6. Tax Breakdown (16% VAT Inclusive) */}
      <div className="space-y-1 text-[9px] border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2 text-center">
        <p className="font-bold text-zinc-700 dark:text-zinc-300">TAX ANALYSIS (16% VAT INCLUSIVE)</p>
        <div className="flex justify-between items-center text-zinc-500 font-mono text-[8.5px]">
          <span>RATE CODE</span>
          <span>TAXABLE   VAT   TOTAL</span>
        </div>
        <div className="flex justify-between items-center font-mono font-bold text-zinc-800 dark:text-zinc-200 text-[9px]">
          <span>A - 16%</span>
          <span>{taxableAmt}  {vatAmt}  {resolvedAmount}</span>
        </div>
      </div>

      {/* 7. Fiscal / M-Pesa Signatures */}
      <div className="space-y-1 text-[9.5px] border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex justify-between items-center">
          <span className="text-zinc-500 font-bold">M-PESA / REF:</span>
          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{cleanReceipt}</span>
        </div>
        <div className="flex justify-between items-center text-zinc-500">
          <span>PAYMENT MODE:</span>
          <span className="font-bold text-zinc-700 dark:text-zinc-300">{paymentMethod}</span>
        </div>
        <div className="flex justify-between items-center text-zinc-500">
          <span>TIMS SIGNATURE:</span>
          <span className="font-mono text-zinc-600 dark:text-zinc-400">8F3A-C94B-20E1-77FA</span>
        </div>
      </div>

      {/* 8. Barcode & Security Validation */}
      <div className="pt-1 text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <QrCode className="w-12 h-12 text-zinc-800 dark:text-zinc-200 p-1 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 shrink-0" />
          <div className="text-left text-[9px] text-zinc-500 dark:text-zinc-400 space-y-0.5">
            <p className="font-bold text-zinc-800 dark:text-zinc-200">SCAN TO VERIFY FISCAL AUTHENTICITY</p>
            <p className="text-[8px] text-primary font-mono">https://kra.akubrecah.com</p>
            <p className="font-mono text-[8px] text-zinc-400">KDPA TOKEN: SHA256-KRA-SEC-OK</p>
          </div>
        </div>

        {/* Decorative fiscal barcode */}
        <div className="flex justify-center items-end gap-[1.5px] h-5 px-4 opacity-80" aria-hidden="true">
          {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 4, 1, 2, 3, 2, 1, 4, 1, 3].map((w, i) => (
            <div
              key={i}
              className="bg-zinc-800 dark:bg-zinc-200 h-full"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
        <p className="text-[8px] text-zinc-400 font-mono tracking-widest">
          * {cleanReceipt} *
        </p>
      </div>

      {/* 9. Tear Line & Notice */}
      <div className="text-center text-[8px] text-zinc-500 space-y-0.5 pt-1">
        <p className="font-bold uppercase text-zinc-700 dark:text-zinc-300">THANK YOU FOR YOUR BUSINESS</p>
        <p>KEEP THIS RECEIPT FOR TAX COMPLIANCE</p>
        <p className="text-[7.5px] text-zinc-400">*** END OF LEGAL FISCAL RECEIPT ***</p>
        <p className="text-[7.5px] font-mono text-zinc-400 tracking-wider pt-1">
          - - - - - - [ CUT HERE ] - - - - - -
        </p>
      </div>

      {/* 10. Action Buttons on Paper */}
      <div className="pt-2 space-y-2">
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading Official PDF...</span>
              </>
            ) : isUnlocked ? (
              <>
                <Download className="w-4 h-4" />
                <span>Download Official KRA Certificate</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay KES 20 to Unlock All Details & Download</span>
              </>
            )}
          </button>
        )}

        {isUnlocked && onDownloadReceipt && (
          <button
            type="button"
            onClick={onDownloadReceipt}
            disabled={isDownloadingReceipt}
            className="w-full h-10 rounded-xl bg-surface-variant hover:bg-surface-variant/80 text-on-surface text-xs font-bold transition-all border border-outline-variant flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDownloadingReceipt ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading ETR Receipt...</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 text-primary" />
                <span>Download Official ETR Receipt (PDF)</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
