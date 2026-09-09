import { describe, it, expect } from 'vitest';
import { validateRut, formatRut, cleanRut } from '@/lib/rut';
import { ApiRequestError } from '@/lib/api';

describe('ABM de Proveedores - Lógica de Validación y Errores', () => {
  describe('Validación de RUT Chileno (Módulo 11)', () => {
    it('debe aceptar RUTs válidos con o sin formato', () => {
      expect(validateRut('77.689.935-6')).toBe(true);
      expect(validateRut('77689935-6')).toBe(true);
      expect(validateRut('776899356')).toBe(true);
      expect(validateRut('76.507.455-K')).toBe(true);
      expect(validateRut('76507455K')).toBe(true);
    });

    it('debe rechazar RUTs con dígito verificador incorrecto', () => {
      expect(validateRut('77.689.935-9')).toBe(false);
      expect(validateRut('77689935-0')).toBe(false);
      expect(validateRut('76.507.455-1')).toBe(false);
    });

    it('debe limpiar y formatear adecuadamente el RUT', () => {
      expect(cleanRut(' 77.689.935-6 ')).toBe('77689935-6');
      expect(formatRut('776899356')).toBe('77.689.935-6');
      expect(formatRut('76507455k')).toBe('76.507.455-K');
    });
  });

  describe('Mapeo de Errores de la API (ApiRequestError)', () => {
    it('debe extraer el mensaje del backend para error 409 (RUT duplicado)', () => {
      const backendMessage = 'Ya existe un proveedor con el RUT 77.689.935-6';
      const error = new ApiRequestError(409, 'CONFLICT', backendMessage);

      expect(error.status).toBe(409);
      expect(error.code).toBe('CONFLICT');
      expect(error.message).toBe(backendMessage);

      // Simula el bloque catch de ProveedorFormPage
      const msg = error instanceof ApiRequestError ? error.message : 'Error genérico';
      expect(msg).toBe(backendMessage);
    });

    it('debe extraer el mensaje del backend para error 400 (Validación inválida)', () => {
      const backendMessage = 'Datos de proveedor inválidos';
      const error = new ApiRequestError(400, 'INVALID_INPUT', backendMessage);

      expect(error.status).toBe(400);
      expect(error.code).toBe('INVALID_INPUT');
      expect(error.message).toBe(backendMessage);

      const msg = error instanceof ApiRequestError ? error.message : 'Error genérico';
      expect(msg).toBe(backendMessage);
    });

    it('debe extraer el mensaje del backend para error 404 (No encontrado)', () => {
      const backendMessage = 'Proveedor no encontrado';
      const error = new ApiRequestError(404, 'NOT_FOUND', backendMessage);

      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe(backendMessage);

      const msg = error instanceof ApiRequestError ? error.message : 'Error genérico';
      expect(msg).toBe(backendMessage);
    });
  });
});
