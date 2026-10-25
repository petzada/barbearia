"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSelectableDateKeys } from "@/lib/agenda/availability";
import { bookAppointmentAction, fetchAvailableDaysAction, fetchSlotsAction } from "@/app/actions/cliente";
import { PageBody, PageHeader } from "@/components/page-header";
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
  shopWhatsapp,
}: {
  services: BookingService[];
  barbers: BookingBarber[];
  rules: BookingRules;
  initialBarberId?: string;
  initialServiceId?: string;
  /** Disponibilidade já calculada no servidor para a pré-seleção ("Agendar de novo"). */
  initialSchedule?: { days: string[]; day: string | null; slots: number[] };
  /** WhatsApp da barbearia (dígitos) para o "Falar com a barbearia" dos estados vazios. */
  shopWhatsapp: string | null;
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
    // Primeira etapa: volta de onde veio (ou para o início, se abriu direto).
    if (window.history.length > 1) router.back();
    else router.push("/inicio");
  }

  const contactHref = shopWhatsapp ? `https://wa.me/${shopWhatsapp}` : null;

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
    <>
      <PageHeader
        title="Novo agendamento"
        onBack={goBack}
        description={<StepIndicator current={sheetOpen ? "summary" : step} />}
        actions={barber && step !== "barber" ? <BarberAvatar name={barber.name} image={barber.image} size="sm" /> : undefined}
      />
      <PageBody>
      {step === "barber" && (
        <BarberStep
          barbers={barbers}
          contactHref={contactHref}
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
          onChangeBarber={singleBarber ? undefined : () => setStep("barber")}
          contactHref={contactHref}
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
      </PageBody>
    </>
  );
}
