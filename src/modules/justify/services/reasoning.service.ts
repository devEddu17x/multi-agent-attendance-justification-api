import { Injectable } from '@nestjs/common';
import { AgentState } from '../../../agents/interfaces/agent-state.interface';

interface ReasoningOutput {
  message: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class ReasoningService {
  generate(
    nodeName: string,
    accumulatedState: AgentState,
    partialState: Partial<AgentState>,
  ): ReasoningOutput | null {
    switch (nodeName) {
      case 'orchestrator':
        return this.buildOrchestratorReasoning(accumulatedState, partialState);
      case 'extractor':
        return this.buildExtractorReasoning(accumulatedState, partialState);
      case 'history':
        return this.buildHistoryReasoning(accumulatedState, partialState);
      case 'regulations':
        return this.buildRegulationsReasoning(accumulatedState, partialState);
      case 'transactional':
        return this.buildTransactionalReasoning(accumulatedState, partialState);
      case 'communicator':
        return this.buildCommunicatorReasoning(accumulatedState, partialState);
      default:
        return null;
    }
  }

  private pick<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private buildOrchestratorReasoning(
    state: AgentState,
    partial: Partial<AgentState>,
  ): ReasoningOutput {
    const next = partial.nextAgent ?? state.nextAgent;
    const hasAttachments = (state.attachments?.length ?? 0) > 0;
    const hasExtractedData =
      state.extractedData && Object.keys(state.extractedData).length > 0;
    const hasHistoryOutput = state.historyOutput?.available === true;
    const hasRegulationsOutput = state.regulationsOutput?.available === true;
    const hasFinalVerdict = state.finalVerdict?.available === true;

    let message: string;

    if (next === 'extractor') {
      if (hasAttachments && !hasExtractedData) {
        message = this.pick([
          'Voy a revisar los documentos adjuntos para entender la solicitud.',
          'Analizaré los archivos adjuntos para extraer la información clave.',
          'Empiezo revisando los documentos que subiste.',
        ]);
      } else {
        message = this.pick([
          'Voy a analizar el mensaje del usuario para entender el contexto.',
          'Revisaré el contenido del mensaje para extraer los detalles.',
          'Empiezo analizando la información proporcionada.',
        ]);
      }
    } else if (next === 'history') {
      message = this.pick([
        'Revisaré el historial de asistencia del estudiante para tener contexto.',
        'Consultaré el registro de asistencias del alumno.',
        'Voy a ver el historial de faltas del estudiante.',
      ]);
    } else if (next === 'regulations') {
      const category = (state.extractedData?.category as string) || 'este caso';
      message = this.pick([
        `Buscaré las normativas que aplican a este caso de ${category}.`,
        `Revisaré el reglamento para justificaciones de ${category}.`,
        `Consultaré las reglas correspondientes a ${category}.`,
      ]);
    } else if (next === 'transactional') {
      message = this.pick([
        'Procederé a evaluar la decisión final sobre la justificación.',
        'Voy a determinar el veredicto y aplicar los cambios.',
        'Evaluaré si se aprueba, rechaza o queda en revisión.',
      ]);
    } else if (next === 'communicator') {
      if (hasFinalVerdict) {
        message = this.pick([
          'Prepararé la respuesta final con el resultado de la evaluación.',
          'Generaré la respuesta para el usuario con la decisión tomada.',
          'Listo, armaré el mensaje de respuesta final.',
        ]);
      } else {
        message = this.pick([
          'Prepararé una respuesta para el usuario con la información actual.',
          'Generaré la respuesta basada en lo que tengo hasta ahora.',
        ]);
      }
    } else {
      message = this.pick([
        'Evaluando el siguiente paso...',
        'Analizando el estado para continuar...',
        'Determinando la siguiente acción...',
      ]);
    }

    return {
      message,
      details: { nextAgent: next },
    };
  }

  private buildExtractorReasoning(
    state: AgentState,
    partial: Partial<AgentState>,
  ): ReasoningOutput {
    const extracted = partial.extractedData ?? state.extractedData;
    if (!extracted) return { message: 'Analizando información...' };

    if (extracted.error === 'parse_failed') {
      return {
        message: this.pick([
          'No logré extraer la información claramente, intentaré continuar con lo que tengo.',
          'La extracción no fue clara, seguiré adelante con el contexto disponible.',
        ]),
        details: { error: 'parse_failed' },
      };
    }

    if (extracted.error === 'api_error') {
      return {
        message: this.pick([
          'Hubo un problema técnico al analizar los documentos, seguiré con el contexto disponible.',
          'No pude procesar los archivos por un error técnico, continuaré con la información del texto.',
        ]),
        details: { error: 'api_error' },
      };
    }

    const numDias = extracted.numDias ?? extracted.days ?? extracted.dias;
    const category = extracted.category as string;
    const motivo = extracted.motivo ?? extracted.reason ?? extracted.mensaje;

    const templates: string[] = [];
    if (numDias !== undefined && category) {
      templates.push(
        `He identificado una justificación de **${category}** por **${numDias} día(s)**.`,
        `Los datos extraídos indican una ausencia de **${numDias} día(s)** por **${category}**.`,
        `Analizando el contenido: se trata de una ausencia de **${numDias} día(s)**, categoría **${category}**.`,
      );
    } else if (category) {
      templates.push(
        `He identificado una justificación de **${category}**.`,
        `La categoría detectada es **${category}**.`,
      );
    } else if (numDias !== undefined) {
      templates.push(
        `He detectado una ausencia de **${numDias} día(s)**.`,
        `El mensaje indica **${numDias} día(s)** de falta.`,
      );
    } else {
      templates.push(
        'He analizado el mensaje y extraído la información relevante.',
        'Extraje los datos principales del contenido.',
      );
    }

    if (motivo) {
      templates.push(
        `He identificado una justificación de **${category || 'ausencia'}**. El motivo mencionado es: "${motivo}".`,
      );
    }

    const message = this.pick(templates);

    return {
      message,
      details: { ...extracted },
    };
  }

  private buildHistoryReasoning(
    state: AgentState,
    partial: Partial<AgentState>,
  ): ReasoningOutput {
    const history = partial.historyOutput ?? state.historyOutput;
    if (!history) return { message: 'Consultando historial de asistencia...' };

    if (history.error === 'api_error') {
      return {
        message: this.pick([
          'No pude consultar el historial de asistencia por un error técnico.',
          'Hubo un problema al obtener el historial del estudiante.',
        ]),
        details: { error: 'api_error' },
      };
    }

    const attendanceRate = history.attendanceRate ?? history.asistencia;
    const recentAbsences =
      history.recentAbsences ?? history.faltasRecientes ?? history.faltas;
    const totalAbsences = history.totalAbsences ?? history.totalFaltas;

    const templates: string[] = [];
    if (attendanceRate !== undefined) {
      templates.push(
        `El estudiante tiene un **${attendanceRate}%** de asistencia.`,
        `Su tasa de asistencia es del **${attendanceRate}%**.`,
        `Registro de asistencia: **${attendanceRate}%**.`,
      );
    }
    if (recentAbsences !== undefined) {
      templates.push(
        `Tiene **${recentAbsences}** falta(s) reciente(s).`,
        `En el período reciente acumula **${recentAbsences}** falta(s).`,
      );
    }
    if (totalAbsences !== undefined) {
      templates.push(
        `Total histórico: **${totalAbsences}** falta(s).`,
        `A lo largo del periodo: **${totalAbsences}** falta(s) registradas.`,
      );
    }

    if (templates.length === 0) {
      templates.push(
        'He revisado el historial de asistencia del estudiante.',
        'Consulté el registro de faltas del alumno.',
      );
    }

    const message = this.pick(templates);

    return {
      message,
      details: { ...history },
    };
  }

  private buildRegulationsReasoning(
    state: AgentState,
    partial: Partial<AgentState>,
  ): ReasoningOutput {
    const regulations = partial.regulationsOutput ?? state.regulationsOutput;
    if (!regulations)
      return { message: 'Consultando normativas aplicables...' };

    if (regulations.error === 'api_error') {
      return {
        message: this.pick([
          'No pude consultar las normativas por un error técnico.',
          'Hubo un problema al revisar el reglamento.',
        ]),
        details: { error: 'api_error' },
      };
    }

    const article = regulations.article ?? regulations.articulo ?? regulations.appliedArticle;
    const category = regulations.category ?? regulations.categoria;
    const compliant = regulations.compliant ?? regulations.cumple;
    const missingDocs = regulations.missingDocuments ?? regulations.documentosFaltantes;
    const ruleSummary = regulations.summary ?? regulations.resumen ?? regulations.regla;

    const templates: string[] = [];
    if (article && category) {
      templates.push(
        `El **${article}** (*${category}*) aplica aquí.`,
        `Regla aplicable: **${article}** — categoría *${category}*.`,
        `Encontré el **${article}** relacionado con *${category}*.`,
      );
    } else if (article) {
      templates.push(
        `El **${article}** aplica a este caso.`,
        `Regla encontrada: **${article}**.`,
      );
    } else if (category) {
      templates.push(
        `La categoría *${category}* está contemplada en el reglamento.`,
        `Revisé las normativas para *${category}*.`,
      );
    } else if (ruleSummary) {
      templates.push(
        `La normativa indica: ${ruleSummary}`,
        `Regla aplicable: ${ruleSummary}`,
      );
    }

    if (compliant === true) {
      templates.push(
        'El documento adjunto cumple con los requisitos establecidos.',
        'La evidencia presentada satisface la normativa.',
        'Los requisitos para esta justificación están completos.',
      );
    } else if (compliant === false) {
      if (Array.isArray(missingDocs) && missingDocs.length > 0) {
        templates.push(
          `Faltan los siguientes documentos: ${missingDocs.join(', ')}.`,
          `Documentos pendientes: ${missingDocs.join(', ')}.`,
        );
      } else {
        templates.push(
          'No se cumplen todos los requisitos de la normativa.',
          'Falta documentación o evidencia para cumplir la regla.',
        );
      }
    }

    if (templates.length === 0) {
      templates.push(
        'He revisado las normativas aplicables al caso.',
        'Consulté el reglamento para esta situación.',
      );
    }

    const message = this.pick(templates);

    return {
      message,
      details: { ...regulations },
    };
  }

  private buildTransactionalReasoning(
    state: AgentState,
    partial: Partial<AgentState>,
  ): ReasoningOutput {
    const verdict = partial.finalVerdict ?? state.finalVerdict;
    if (!verdict) return { message: 'Evaluando decisión final...' };

    if (verdict.error === 'api_error') {
      return {
        message: this.pick([
          'Hubo un error técnico al tomar la decisión final.',
          'No pudo completarse la evaluación transaccional por un problema técnico.',
        ]),
        details: { error: 'api_error' },
      };
    }

    const v = verdict.verdict as string;
    const reason = verdict.reason ?? verdict.razon;
    const article = verdict.appliedArticle ?? verdict.articulo;
    const missingDocs = verdict.missingDocuments ?? verdict.documentosFaltantes;
    const linkedCount =
      verdict.linkedCount ??
      verdict.attendancesLinked ??
      (state.extractedData?.numDias as number);

    const templates: string[] = [];
    if (v === 'AUTO_APPROVED') {
      templates.push(
        `Veredicto: **AUTO_APPROVED**.${reason ? ` ${reason}` : ''}`,
        `La justificación fue **aprobada automáticamente**.${reason ? ` Motivo: ${reason}` : ''}`,
      );
    } else if (v === 'PENDING_REVIEW') {
      templates.push(
        `Veredicto: **PENDING_REVIEW**.${reason ? ` ${reason}` : ''}`,
        `La justificación queda **en revisión**.${reason ? ` ${reason}` : ''}`,
      );
    } else if (v === 'REJECTED') {
      templates.push(
        `Veredicto: **REJECTED**.${reason ? ` ${reason}` : ''}`,
        `La justificación fue **rechazada**.${reason ? ` ${reason}` : ''}`,
      );
    } else {
      templates.push(
        `Veredicto: **${v}**.${reason ? ` ${reason}` : ''}`,
      );
    }

    if (article) {
      templates.push(
        `Artículo aplicado: **${article}**.`,
      );
    }

    if (Array.isArray(missingDocs) && missingDocs.length > 0) {
      templates.push(
        `Documentos faltantes: ${missingDocs.join(', ')}.`,
      );
    }

    if (linkedCount !== undefined) {
      templates.push(
        `Se vincularon **${linkedCount}** registro(s) de asistencia.`,
      );
    }

    const message = this.pick(templates);

    return {
      message,
      details: { ...verdict },
    };
  }

  private buildCommunicatorReasoning(
    _state: AgentState,
    _partial: Partial<AgentState>,
  ): ReasoningOutput {
    return {
      message: this.pick([
        'Generando respuesta final...',
        'Preparando el mensaje de respuesta...',
        'Armando la respuesta para el usuario...',
      ]),
    };
  }
}
