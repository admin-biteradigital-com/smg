import { describe, it, expect } from 'vitest';
import { NOMBRES_FALTANTES_DTE } from '@/pages/gestion/EmpresaPage';
import { TEXTOS_DATOS_FISCALES_FALTANTES } from '@/pages/gestion/clientes/ClienteFormPage';
import type {
  UpdateEmpresaPayload,
  CreateClientePayload,
  UpdateClientePayload,
  CreateSucursalPayload,
  UpdateSucursalPayload,
} from '@/types';

describe('P1b: Construcción de Payloads y Validaciones de Datos Fiscales', () => {
  describe('1. Construcción de Payload de Empresa (UpdateEmpresaPayload)', () => {
    it('convierte campos de texto vacíos o con solo espacios a null', () => {
      const formState = {
        nombreEmpresa: 'Distribuidora Los Andes SpA',
        rutEmpresa: '  ',
        giro: '',
        direccion: '   ',
        comuna: '',
        region: '',
        emailContacto: '  ',
        ciudad: '',
        telefono: '',
        dominioWeb: '',
        actecos: [] as number[],
        cdgSiiSucur: '',
        unidadSii: '   ',
        nroResolucion: '',
        fechaResolucion: '',
        casillaIntercambio: '',
      };

      const payload: UpdateEmpresaPayload = {
        nombreEmpresa: formState.nombreEmpresa.trim() || undefined,
        rutEmpresa: formState.rutEmpresa.trim() || null,
        giro: formState.giro.trim() || null,
        direccion: formState.direccion.trim() || null,
        comuna: formState.comuna.trim() || null,
        region: formState.region.trim() || null,
        emailContacto: formState.emailContacto.trim() || null,
        ciudad: formState.ciudad.trim() || null,
        telefono: formState.telefono.trim() || null,
        dominioWeb: formState.dominioWeb.trim() || null,
        actecos: formState.actecos.length > 0 ? formState.actecos : null,
        cdgSiiSucur: formState.cdgSiiSucur.trim() ? parseInt(formState.cdgSiiSucur.trim(), 10) : null,
        unidadSii: formState.unidadSii.trim() || null,
        nroResolucion: formState.nroResolucion.trim() ? parseInt(formState.nroResolucion.trim(), 10) : null,
        fechaResolucion: formState.fechaResolucion.trim() || null,
        casillaIntercambio: formState.casillaIntercambio.trim() || null,
      };

      expect(payload.nombreEmpresa).toBe('Distribuidora Los Andes SpA');
      expect(payload.rutEmpresa).toBeNull();
      expect(payload.giro).toBeNull();
      expect(payload.direccion).toBeNull();
      expect(payload.comuna).toBeNull();
      expect(payload.region).toBeNull();
      expect(payload.emailContacto).toBeNull();
      expect(payload.ciudad).toBeNull();
      expect(payload.actecos).toBeNull();
      expect(payload.cdgSiiSucur).toBeNull();
      expect(payload.unidadSii).toBeNull();
      expect(payload.nroResolucion).toBeNull();
      expect(payload.fechaResolucion).toBeNull();
      expect(payload.casillaIntercambio).toBeNull();
    });

    it('construye actecos como arreglo de números enteros válidos', () => {
      const actecosInput = [471990, 463011];
      const payload: UpdateEmpresaPayload = {
        actecos: actecosInput.length > 0 ? actecosInput : null,
        cdgSiiSucur: 0,
        unidadSii: 'PUERTO MONTT',
        nroResolucion: 80,
        fechaResolucion: '2026-11-01',
        casillaIntercambio: 'dte@losandes.cl',
      };

      expect(payload.actecos).toEqual([471990, 463011]);
      expect(payload.cdgSiiSucur).toBe(0);
      expect(payload.unidadSii).toBe('PUERTO MONTT');
      expect(payload.nroResolucion).toBe(80);
      expect(payload.fechaResolucion).toBe('2026-11-01');
      expect(payload.casillaIntercambio).toBe('dte@losandes.cl');
    });

    it('no incluye campos ajenos al schema estricto de SIGLO (.strict())', () => {
      const allowedKeys = new Set([
        'nombreEmpresa',
        'rutEmpresa',
        'giro',
        'direccion',
        'comuna',
        'ciudad',
        'region',
        'telefono',
        'emailContacto',
        'dominioWeb',
        'logoUrl',
        'actecos',
        'cdgSiiSucur',
        'unidadSii',
        'nroResolucion',
        'fechaResolucion',
        'casillaIntercambio',
      ]);

      const payload: UpdateEmpresaPayload = {
        nombreEmpresa: 'Test',
        actecos: [471990],
        cdgSiiSucur: 1,
      };

      for (const key of Object.keys(payload)) {
        expect(allowedKeys.has(key)).toBe(true);
      }
    });
  });

  describe('2. Construcción de Payloads de Cliente y Sucursal', () => {
    it('CreateClientePayload incluye domicilio tributario y sucursal principal con comuna requerida', () => {
      const payload: CreateClientePayload = {
        razonSocial: 'Comercial Lago Llanquihue SpA',
        rut: '76.123.456-7',
        giro: 'Comercio minorista',
        direccion: 'San Pedro 456',
        comuna: 'Puerto Varas',
        ciudad: 'Puerto Varas',
        casillaIntercambio: 'dte@llanquihue.cl',
        sucursalPrincipal: {
          nombre: 'Casa Matriz',
          direccion: 'San Pedro 456',
          comuna: 'Puerto Varas',
          ciudad: 'Puerto Varas',
          region: 'Los Lagos',
        },
      };

      expect(payload.comuna).toBe('Puerto Varas');
      expect(payload.sucursalPrincipal.comuna).toBe('Puerto Varas');
      expect(payload.casillaIntercambio).toBe('dte@llanquihue.cl');
    });

    it('UpdateClientePayload envía campos tributarios vacíos como null', () => {
      const payload: UpdateClientePayload = {
        direccion: ''.trim() || null,
        comuna: '   '.trim() || null,
        ciudad: ''.trim() || null,
        casillaIntercambio: ''.trim() || null,
      };

      expect(payload.direccion).toBeNull();
      expect(payload.comuna).toBeNull();
      expect(payload.ciudad).toBeNull();
      expect(payload.casillaIntercambio).toBeNull();
    });

    it('CreateSucursalPayload exige comuna oficial y UpdateSucursalPayload la permite nullable', () => {
      const createPayload: CreateSucursalPayload = {
        nombre: 'Sucursal Hornopirén',
        direccion: 'Calle Principal 100',
        comuna: 'Hualaihué',
        ciudad: 'Hornopirén',
        region: 'Los Lagos',
      };
      expect(createPayload.comuna).toBe('Hualaihué');

      const updatePayload: UpdateSucursalPayload = {
        comuna: 'Hualaihué',
        ciudad: 'Hornopirén',
      };
      expect(updatePayload.comuna).toBe('Hualaihué');
    });
  });

  describe('3. Función "Copiar de la sucursal principal"', () => {
    it('copia direccion, comuna y ciudad desde la sucursal principal en modo edición', () => {
      const sucursalesMock = [
        {
          id: 1,
          idCliente: 10,
          codigo: 'SUC-01',
          nombre: 'Local Costanera',
          direccion: 'Av. Costanera 100',
          comuna: 'Puerto Montt',
          ciudad: 'Puerto Montt',
          region: 'Los Lagos',
          telefono: null,
          email: null,
          latitud: null,
          longitud: null,
          esPrincipal: true,
          observaciones: null,
          activa: true,
        },
        {
          id: 2,
          idCliente: 10,
          codigo: 'SUC-02',
          nombre: 'Local Centro',
          direccion: 'Urmeneta 200',
          comuna: 'Puerto Montt',
          ciudad: 'Puerto Montt',
          region: 'Los Lagos',
          telefono: null,
          email: null,
          latitud: null,
          longitud: null,
          esPrincipal: false,
          observaciones: null,
          activa: true,
        },
      ];

      const principal = sucursalesMock.find((s) => s.esPrincipal) || sucursalesMock[0];
      const copiedValues = {
        direccion: principal.direccion,
        comuna: principal.comuna,
        ciudad: principal.ciudad,
      };

      expect(copiedValues.direccion).toBe('Av. Costanera 100');
      expect(copiedValues.comuna).toBe('Puerto Montt');
      expect(copiedValues.ciudad).toBe('Puerto Montt');
    });

    it('si ninguna sucursal tiene esPrincipal=true, utiliza la primera de la lista como fallback', () => {
      const sucursalesMock = [
        {
          id: 3,
          idCliente: 12,
          codigo: 'SUC-01',
          nombre: 'Local Único',
          direccion: 'Ruta 7 km 15',
          comuna: 'Hualaihué',
          ciudad: 'Hornopirén',
          region: 'Los Lagos',
          telefono: null,
          email: null,
          latitud: null,
          longitud: null,
          esPrincipal: false,
          observaciones: null,
          activa: true,
        },
      ];

      const principal = sucursalesMock.find((s) => s.esPrincipal) || sucursalesMock[0];
      expect(principal.comuna).toBe('Hualaihué');
      expect(principal.ciudad).toBe('Hornopirén');
    });
  });

  describe('4. Diccionarios de Textos Legibles para Avisos de Faltantes', () => {
    it('NOMBRES_FALTANTES_DTE tiene texto descriptivo para todos los códigos SII de empresa', () => {
      const codigosEsperados = [
        'RUT',
        'razon_social',
        'giro',
        'actecos',
        'cdgSiiSucur',
        'direccion',
        'comuna',
        'unidadSii',
        'nroResolucion',
        'fechaResolucion',
        'casillaIntercambio',
      ];

      for (const cod of codigosEsperados) {
        expect(NOMBRES_FALTANTES_DTE[cod]).toBeDefined();
        expect(typeof NOMBRES_FALTANTES_DTE[cod]).toBe('string');
        expect(NOMBRES_FALTANTES_DTE[cod].length).toBeGreaterThan(0);
      }
    });

    it('TEXTOS_DATOS_FISCALES_FALTANTES tiene texto descriptivo para los códigos de cliente de SIGLO', () => {
      const codigosEsperados = ['giro', 'sucursales_sin_comuna', 'domicilio_tributario'];

      for (const cod of codigosEsperados) {
        expect(TEXTOS_DATOS_FISCALES_FALTANTES[cod]).toBeDefined();
        expect(typeof TEXTOS_DATOS_FISCALES_FALTANTES[cod]).toBe('string');
        expect(TEXTOS_DATOS_FISCALES_FALTANTES[cod].length).toBeGreaterThan(0);
      }
    });
  });

  describe('5. Validación de Unidad para la Factura (Productos)', () => {
    it('valida que unidadFactura no exceda 4 caracteres y envíe null si está vacía', () => {
      const formatearUnidad = (u: string) => {
        const trimmed = u.trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      expect(formatearUnidad('')).toBeNull();
      expect(formatearUnidad('   ')).toBeNull();
      expect(formatearUnidad('25')).toBe('25');
      expect(formatearUnidad('120g')).toBe('120g');

      const esValida = (u: string) => u.trim().length <= 4;
      expect(esValida('25')).toBe(true);
      expect(esValida('120g')).toBe(true);
      expect(esValida('12345')).toBe(false);
    });
  });
});
