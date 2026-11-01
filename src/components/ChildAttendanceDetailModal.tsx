import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImageLightbox } from '@/components/ImageLightbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChildAttendanceSummary } from '@/services/attendanceReports'
import { formatDate } from '@/lib/academic'
import { CheckCircle2, XCircle, HelpCircle, MinusCircle, MessageSquare } from 'lucide-react'

interface ChildAttendanceDetailModalProps {
  summary: ChildAttendanceSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ChildAttendanceDetailModal: React.FC<ChildAttendanceDetailModalProps> = ({
  open,
  onOpenChange,
  summary,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!summary) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  if (summary.photoUrl) setLightboxOpen(true)
                }}
                className={`h-10 w-10 rounded-full overflow-hidden bg-slate-200 border shrink-0 transition-transform ${
                  summary.photoUrl
                    ? 'cursor-pointer hover:scale-105 hover:ring-2 hover:ring-indigo-500 focus:outline-none'
                    : ''
                }`}
                title={
                  summary.photoUrl ? `Clique para ampliar foto de ${summary.childName}` : undefined
                }
              >
                {summary.photoUrl ? (
                  <img
                    src={summary.photoUrl}
                    alt={summary.childName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center font-bold text-slate-600 text-xs">
                    {summary.childName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </button>{' '}
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {summary.childName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Histórico de presença detalhado na Sala {summary.classroom}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Resumo rápido no modal */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border">
            <div>
              <p className="text-muted-foreground text-[10px]">Aulas</p>
              <p className="font-bold text-slate-800 dark:text-slate-200">{summary.totalLessons}</p>
            </div>
            <div>
              <p className="text-emerald-600 text-[10px]">Presenças</p>
              <p className="font-bold text-emerald-700">{summary.presents}</p>
            </div>
            <div>
              <p className="text-rose-600 text-[10px]">Ausências</p>
              <p className="font-bold text-rose-700">{summary.absents}</p>
            </div>
            <div>
              <p className="text-indigo-600 text-[10px]">Frequência</p>
              <p className="font-bold text-indigo-700">{summary.percentage}%</p>
            </div>
          </div>

          {summary.warningReason && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-200 text-xs font-medium">
              ⚠️ <strong>Atenção:</strong> {summary.warningReason}
            </div>
          )}

          {/* Lista de Aulas e Chamadas */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {summary.details.map((detail, idx) => (
              <div
                key={detail.lessonId || idx}
                className="p-2.5 rounded-lg border bg-white dark:bg-slate-950 flex flex-col gap-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatDate(detail.lessonDate)}
                    </span>
                    {detail.sessionNumber && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4">
                        Aula #{detail.sessionNumber}
                      </Badge>
                    )}
                  </div>

                  <div>
                    {detail.status === 'present' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Presente
                      </span>
                    )}
                    {detail.status === 'absent' && (
                      <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200">
                        <XCircle className="h-3.5 w-3.5" /> Ausente
                      </span>
                    )}
                    {detail.status === 'justified' && (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200">
                        <HelpCircle className="h-3.5 w-3.5" /> Justificada
                      </span>
                    )}
                    {detail.status === 'unregistered' && (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        <MinusCircle className="h-3.5 w-3.5" /> Não lançada
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground truncate">{detail.theme}</p>

                {detail.justification && (
                  <div className="text-[11px] bg-amber-50/80 dark:bg-amber-950/30 p-1.5 rounded border border-amber-200/60 text-amber-900 dark:text-amber-200">
                    <strong>Justificativa:</strong> {detail.justification}
                  </div>
                )}

                {detail.notes && (
                  <div className="text-[11px] bg-sky-50/60 dark:bg-sky-950/30 p-1.5 rounded border border-sky-200/60 text-sky-900 dark:text-sky-200 flex items-start gap-1">
                    <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-sky-600" />
                    <span>
                      <strong>Observação:</strong> {detail.notes}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {summary.details.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">
                Nenhuma aula encontrada para este período.
              </p>
            )}
          </div>

          <div className="pt-2 border-t flex justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {lightboxOpen && summary.photoUrl && (
        <ImageLightbox
          src={summary.photoUrl}
          title={summary.childName}
          description={`Sala ${summary.classroom}`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
