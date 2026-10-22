"use client";

import React, {
  type ComponentPropsWithoutRef,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/helpers/classname-helper";
import { Check, Loader2, QrCode, ShieldCheck, Printer, Download, Sparkles } from "lucide-react";

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
        "relative z-50 -mt-4 min-h-[32rem] w-[calc(90%+1.5rem)] max-w-full overflow-hidden px-4",
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
 * GovTech Prestige Tax Compliance Certificate Paper Content
 * Perfectly matches website design tokens, Republic of Kenya branding, and KDPA standards
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
  onDownload,
  isDownloading = false,
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
  onDownload?: () => void;
  isDownloading?: boolean;
}) {
  return (
    <div className="space-y-4 text-xs font-mono">
      {/* Official Government Header */}
      <div className="text-center border-b-2 border-dashed border-zinc-300 dark:border-zinc-700 pb-3">
        <div className="flex items-center justify-center gap-1.5 text-primary font-black text-sm tracking-widest uppercase">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>REPUBLIC OF KENYA</span>
        </div>
        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
          KENYA REVENUE AUTHORITY (KRA)
        </p>
        <p className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide mt-1">
          TAX COMPLIANCE CERTIFICATE
        </p>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold mt-1.5">
          <Check className="w-3 h-3" /> DIGITAL VERIFICATION SEAL ACTIVE
        </div>
      </div>

      {/* Taxpayer Core Fields */}
      <div className="space-y-2 py-1 text-[11px]">
        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">PIN:</span>
          <span className="font-black text-primary font-mono tracking-wider">{pin || "A012345678Z"}</span>
        </div>

        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Name:</span>
          <span className="font-bold text-right truncate max-w-[210px] uppercase text-zinc-900 dark:text-zinc-100">
            {name || "REGISTERED CITIZEN"}
          </span>
        </div>

        {idNumber && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">National ID:</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-200">{idNumber}</span>
          </div>
        )}

        {station && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Tax Station:</span>
            <span className="text-zinc-800 dark:text-zinc-200">{station}</span>
          </div>
        )}

        <div className="flex justify-between items-start gap-2">
          <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Date Issued:</span>
          <span className="text-zinc-800 dark:text-zinc-200">{registeredDate || new Date().toLocaleDateString('en-GB')}</span>
        </div>

        {(building || street || town || county) && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Location:</span>
            <span className="text-right text-[10px] text-zinc-800 dark:text-zinc-200 max-w-[200px]">
              {[building, street, town || county].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {email && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Email:</span>
            <span className="text-right text-[10px] text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
              {email}
            </span>
          </div>
        )}

        {phoneNumber && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Phone:</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-200">{phoneNumber}</span>
          </div>
        )}
      </div>

      {/* Barcode & Security Validation */}
      <div className="border-t border-dashed border-zinc-300 dark:border-zinc-700 pt-3 text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <QrCode className="w-12 h-12 text-zinc-800 dark:text-zinc-200 p-1 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 shrink-0" />
          <div className="text-left text-[9px] text-zinc-500 dark:text-zinc-400 space-y-0.5">
            <p className="font-bold text-zinc-800 dark:text-zinc-200">AUTHENTICITY VERIFIED</p>
            <p>KDPA Compliance Token</p>
            <p className="font-mono text-[8px] text-zinc-400">HASH: SHA256-KRA-SEC-OK</p>
          </div>
        </div>

        {/* Decorative barcode */}
        <div className="flex justify-center items-end gap-[1.5px] h-6 px-4 opacity-80" aria-hidden="true">
          {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 4, 1, 2, 3, 2, 1, 4, 1, 3].map((w, i) => (
            <div
              key={i}
              className="bg-zinc-800 dark:bg-zinc-200 h-full"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
        <p className="text-[8px] text-zinc-400 font-mono tracking-widest">
          * {pin || "KRA-OFFICIAL-2026"} *
        </p>
      </div>

      {/* Action Buttons on Paper */}
      {onDownload && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="w-full h-10 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-md shadow-primary/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isUnlocked ? "Download Official PDF" : "Pay KES 20 & Download"}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
