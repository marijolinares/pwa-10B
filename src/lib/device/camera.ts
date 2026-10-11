import { failure, success } from "../capabilities/result";
import type { CapabilityResult } from "../capabilities/result";

/**
 * Evidencia fotográfica opcional de una inspección.
 *
 * Solo se conserva lo mínimo: el archivo, su tipo y su tamaño. No se guarda el
 * nombre original (puede incluir datos personales) y nada se envía ni se
 * persiste: la foto vive en memoria hasta que la interfaz decida qué hacer.
 */
export type EvidenceAttachment = {
  file: File;
  type: string;
  size: number;
};

/** Tamaño máximo de una foto de evidencia: 5 MB. */
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

/** Se añade a cada mensaje: la evidencia es opcional y el flujo sigue sin ella. */
const SKIP_HINT = "La inspección se guarda igual, sin evidencia.";

/** Indica si hay un documento donde crear el selector de imagen (no hay en el servidor). */
export function isCameraCaptureSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.createElement === "function" &&
    !!document.body
  );
}

/**
 * Valida el archivo elegido: debe existir, ser una imagen no vacía y pesar
 * como máximo MAX_EVIDENCE_BYTES. Nunca lanza error.
 */
export function validateEvidenceFile(
  file: File | null | undefined,
): CapabilityResult<EvidenceAttachment> {
  if (!file) {
    return failure("unavailable", `No se seleccionó ninguna foto. ${SKIP_HINT}`);
  }
  if (typeof file.type !== "string" || !file.type.startsWith("image/")) {
    return failure("error", `El archivo elegido no es una imagen. ${SKIP_HINT}`);
  }
  if (file.size <= 0) {
    return failure("error", `La imagen está vacía. ${SKIP_HINT}`);
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    const mb = MAX_EVIDENCE_BYTES / (1024 * 1024);
    return failure(
      "error",
      `La foto pesa más de ${mb} MB. Toma otra con menor resolución. ${SKIP_HINT}`,
    );
  }
  return success({ file, type: file.type, size: file.size });
}

/**
 * Abre el selector de imagen del dispositivo para adjuntar una foto como
 * evidencia. En el teléfono abre la cámara trasera; en una computadora, el
 * selector de archivos.
 *
 * Debe llamarse SOLO desde una acción de la persona (por ejemplo, el clic de un
 * botón): nunca abre nada al importar el módulo. No usa getUserMedia, así que
 * JavaScript no pide acceso a la cámara: el sistema entrega solo el archivo.
 *
 * Nunca lanza error: devuelve el motivo si no hay soporte, la persona cancela,
 * el archivo no es válido o el navegador falla.
 */
export function captureEvidence(): Promise<CapabilityResult<EvidenceAttachment>> {
  return new Promise((resolve) => {
    let input: HTMLInputElement | undefined;
    let settled = false;

    const finish = (result: CapabilityResult<EvidenceAttachment>) => {
      if (settled) return;
      settled = true;
      try {
        input?.remove();
      } catch {
        /* nada que limpiar */
      }
      resolve(result);
    };

    try {
      if (!isCameraCaptureSupported()) {
        finish(
          failure(
            "unsupported",
            `Este navegador no permite adjuntar fotos. ${SKIP_HINT}`,
          ),
        );
        return;
      }

      const element = document.createElement("input");
      input = element;
      element.setAttribute("type", "file");
      element.setAttribute("accept", "image/*");
      element.setAttribute("capture", "environment");
      element.style.display = "none";

      element.addEventListener("change", () => {
        try {
          finish(validateEvidenceFile(element.files?.[0]));
        } catch {
          finish(
            failure(
              "error",
              `Ocurrió un error al leer la foto. ${SKIP_HINT}`,
            ),
          );
        }
      });

      // Si la persona cierra el selector sin elegir nada.
      element.addEventListener("cancel", () => {
        finish(
          failure(
            "unavailable",
            `No se seleccionó ninguna foto. ${SKIP_HINT}`,
          ),
        );
      });

      document.body.appendChild(element);
      element.click();
    } catch {
      finish(
        failure("error", `Ocurrió un error al abrir la cámara. ${SKIP_HINT}`),
      );
    }
  });
}