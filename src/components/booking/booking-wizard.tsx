"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getSelectableDateKeys } from "@/lib/agenda/availability";
import { bookAppointmentAction, fetchSlotsAction } from "@/app/actions/cliente";
import { BarberAvatar } from "./barber-avatar";
import { BarberStep } from "./barber-step";
import { BookingTopbarCarousel, BOOKING_TOPBAR_HEIGHT_CLASS } from "./booking-topbar-carousel";
import { ScheduleStep } from "./schedule-step";
import { ServiceStep } from "./service-step";
import { StepIndicator, type WizardStep } from "./step-indicator";
import { SummaryStep, type PaymentChoice } from "./summary-step";
import type { BookingBarber, BookingRules, BookingService } from "./types";

const BACK: Record<WizardStep, WizardStep | null> = {
  barber: null,
  service: "barber",
  schedule: "service",
  summary: "schedule",
};

export function BookingWizard({
  services,
  barbers,
  rules,
}: {
  services: BookingService[];
  barbers: BookingBarber[];
  rules: BookingRules;
}) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(barbers.length === 1 ? "service" : "barber");
  const [barber, setBarber] = useState<BookingBarber | null>(barbers.length === 1 ? barbers[0] : null);
  const [service, setService] = useState<BookingService | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<number[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  const [payment, setPayment] = useState<PaymentChoice>(rules.onlinePayment ? "pix" : "local");
  const [loadingSlots, startLoading] = useTransition();
  const [confirming, startConfirm] = useTransition();

  function loadSlots(barberId: string, serviceId: string, dateKey: string) {
    startLoading(async () => {
      const result = await fetchSlotsAction({ barberId, serviceId, dateKey });
      if (!result.ok) {
        toast.error(result.error);
        setSlots([]);
        return;
      }
      setSlots(result.data);
    });
  }

  function selectService(s: BookingService) {
    setService(s);
    const today = getSelectableDateKeys(rules.bookingWindowDays)[0];
    setDay(today);
    setSlot(null);
    setSlots([]);
    if (barber && today) loadSlots(barber.id, s.id, today);
    setStep("schedule");
  }

  function selectDay(dateKey: string) {
    setDay(dateKey);
    setSlot(null);
    if (barber && service) loadSlots(barber.id, service.id, dateKey);
  }

  function goBack() {
    const prev = BACK[step];
    if (!prev || (prev === "barber" && barbers.length === 1)) {
      router.push("/inicio");
      return;
    }
    setStep(prev);
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
          setStep("schedule");
          loadSlots(barber.id, service.id, day);
        }
        return;
      }
      toast.success("Agendamento confirmado!");
      if (result.data.paymentId) {
        router.push(`/agendamentos/${result.data.entryId}/pix`);
      } else {
        if (payment === "pix") toast.info("Pix indisponível agora — pague na barbearia.");
        router.push("/agendamentos");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={`relative -mx-5 overflow-hidden lg:mx-0 lg:mt-6 lg:rounded-[28px] ${BOOKING_TOPBAR_HEIGHT_CLASS}`}>
        <BookingTopbarCarousel />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/70" />
        <button
          type="button"
          onClick={goBack}
          aria-label="Voltar"
          className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/55"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="absolute inset-x-5 bottom-5 z-10 flex items-end justify-between gap-3 text-white">
          <div>
            <p className="text-sm font-semibold text-white/75">Novo agendamento</p>
            <p className="text-2xl font-extrabold tracking-tight">{barber ? barber.name : "Barbearia do Moura"}</p>
          </div>
          {barber && <BarberAvatar name={barber.name} image={barber.image} size="md" />}
        </div>
      </div>

      <StepIndicator current={step} />

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
          day={day}
          slots={slots}
          pending={loadingSlots}
          windowDays={rules.bookingWindowDays}
          onSelectDay={selectDay}
          onSelectSlot={(s) => {
            setSlot(s);
            setStep("summary");
          }}
        />
      )}
      {step === "summary" && barber && service && slot != null && (
        <SummaryStep
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
