"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { getSelectableDateKeys } from "@/lib/agenda/availability";
import { bookAppointmentAction, fetchAvailableDaysAction, fetchSlotsAction } from "@/app/actions/cliente";
import { BarberAvatar } from "./barber-avatar";
import { BarberStep } from "./barber-step";
import { ConfirmSheet, type PaymentChoice } from "./confirm-sheet";
import { ScheduleStep } from "./schedule-step";
import { ServiceStep } from "./service-step";
import { StepIndicator, type WizardStep } from "./step-indicator";
import type { BookingBarber, BookingRules, BookingService } from "./types";

export function BookingWizard({
  services,
  barbers,
  rules,
  initialBarberId,
  initialServiceId,
  initialSchedule,
}: {
  services: BookingService[];
  barbers: BookingBarber[];
  rules: BookingRules;
  initialBarberId?: string;
  initialServiceId?: string;
  /** Disponibilidade já calculada no servidor para a pré-seleção ("Agendar de novo"). */
  initialSchedule?: { days: string[]; day: string | null; slots: number[] };
}) {
  const router = useRouter();
  const singleBarber = barbers.length === 1 ? barbers[0] : null;
  const presetBarber = barbers.find((b) => b.id === initialBarberId) ?? singleBarber;
  const presetService = presetBarber ? services.find((s) => s.id === initialServiceId) ?? null : null;

  const [step, setStep] = useState<Exclude<WizardStep, "summary">>(
    presetService ? "schedule" : presetBarber ? "service" : "barber",
  );
  const [barber, setBarber] = useState<BookingBarber | null>(presetBarber);
  const [service, setService] = useState<BookingService | null>(presetService);
  const [availableDays, setAvailableDays] = useState<Set<string> | null>(
    presetService && initialSchedule ? new Set(initialSchedule.days) : null,
  );
  const [day, setDay] = useState<string | null>(presetService ? (initialSchedule?.day ?? null) : null);
  const [slots, setSlots] = useState<number[]>(presetService ? (initialSchedule?.slots ?? []) : []);
  const [slot, setSlot] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payment, setPayment] = useState<PaymentChoice>(rules.onlinePayment ? "pix" : "local");
  const [loadingSlots, startLoadingSlots] = useTransition();
  const [confirming, startConfirm] = useTransition();
  const windowKeys = useMemo(() => getSelectableDateKeys(rules.bookingWindowDays), [rules.bookingWindowDays]);

  function loadSlots(barberId: string, serviceId: string, dateKey: string) {
    setSlots([]);
    startLoadingSlots(async () => {
      const result = await fetchSlotsAction({ barberId, serviceId, dateKey });
      if (!result.ok) return void toast.error(result.error);
      setSlots(result.data);
    });
  }

  async function loadDays(barberId: string, serviceId: string) {
    setAvailableDays(null);
    setDay(null);
    setSlot(null);
    const result = await fetchAvailableDaysAction({
      barberId,
      serviceId,
      from: windowKeys[0],
      to: windowKeys[windowKeys.length - 1],
    });
    if (!result.ok) {
      toast.error(result.error);
      setAvailableDays(new Set());
      return;
    }
    const days = new Set(result.data);
    setAvailableDays(days);
    const first = result.data[0];
    if (first) {
      setDay(first);
      loadSlots(barberId, serviceId, first);
    }
  }

  function selectService(s: BookingService) {
    setService(s);
    setStep("schedule");
    if (barber) void loadDays(barber.id, s.id);
  }

  function goBack() {
    if (step === "schedule") return setStep("service");
    if (step === "service" && !singleBarber) return setStep("barber");
    router.push("/inicio");
  }

  function confirm() {
    if (!barber || !service || slot == null) return;
    startConfirm(async () => {
      const result = await bookAppointmentAction({
        barberId: barber.id,
        serviceId: service.id,
        startsAt: slot,
        paymentChoice: payment,
      });
      if (!result.ok) {
        toast.error(result.error);
        if (result.code === "conflict" && day) {
          setSheetOpen(false);
          setSlot(null);
          loadSlots(barber.id, service.id, day);
        }
        return;
      }
      if (result.data.paymentId) {
        router.push(`/agendamentos/${result.data.entryId}/pix`);
      } else {
        if (payment === "pix") toast.info("Pix indisponível agora — pague na barbearia.");
        router.push(`/agendamentos/${result.data.entryId}/confirmado`);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5 pt-[calc(1rem+env(safe-area-inset-top))] lg:pt-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          aria-label="Voltar"
          className="-ml-2 flex size-11 items-center justify-center rounded-full text-cta transition hover:bg-muted"
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
        <h1 className="flex-1 text-xl font-extrabold tracking-tight">Novo agendamento</h1>
        {barber && step !== "barber" && <BarberAvatar name={barber.name} image={barber.image} size="sm" />}
      </div>

      <StepIndicator current={sheetOpen ? "summary" : step} />

      {step === "barber" && (
        <BarberStep
          barbers={barbers}
          onSelect={(b) => {
            setBarber(b);
            setStep("service");
          }}
        />
      )}
      {step === "service" && <ServiceStep services={services} onSelect={selectService} />}
      {step === "schedule" && (
        <ScheduleStep
          windowKeys={windowKeys}
          availableDays={availableDays}
          day={day}
          slots={slots}
          loadingSlots={loadingSlots}
          selectedSlot={slot}
          onSelectDay={(d) => {
            setDay(d);
            setSlot(null);
            if (barber && service) loadSlots(barber.id, service.id, d);
          }}
          onSelectSlot={(s) => {
            setSlot(s);
            setSheetOpen(true);
          }}
        />
      )}

      {barber && service && (
        <ConfirmSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          barber={barber}
          service={service}
          slot={slot}
          rules={rules}
          payment={payment}
          pending={confirming}
          onPaymentChange={setPayment}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
