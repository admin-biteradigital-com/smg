import { useState, useEffect, useRef, useMemo, useId } from 'react';
import { Search, ChevronDown, Check, AlertTriangle, X, Loader2 } from 'lucide-react';
import { getComunas } from '@/lib/api';
import type { ComunaItem } from '@/types';

/**
 * Normaliza un texto removiendo tildes, diacríticos y convirtiendo a minúsculas.
 * Permite búsquedas agnósticas de acentos ("hualaihue" coincide con "Hualaihué").
 */
export function normalizarTexto(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Busca si un nombre de comuna coincide exactamente con alguna comuna oficial.
 */
export function buscarComunaOficial(
  nombre: string,
  comunas: readonly ComunaItem[]
): ComunaItem | undefined {
  const norm = normalizarTexto(nombre);
  if (!norm) return undefined;
  return comunas.find((c) => normalizarTexto(c.nombre) === norm);
}

/**
 * Filtra el catálogo de comunas según el término ingresado por el usuario.
 */
export function filtrarComunas(
  busqueda: string,
  comunas: readonly ComunaItem[]
): ComunaItem[] {
  const termino = normalizarTexto(busqueda);
  if (!termino) return comunas.slice(0, 30);

  return comunas.filter((c) => {
    const nomNorm = normalizarTexto(c.nombre);
    const regNorm = normalizarTexto(c.region);
    return nomNorm.includes(termino) || regNorm.includes(termino);
  });
}

export interface SelectorComunaProps {
  value: string;
  onChange: (comuna: string, region: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}

export default function SelectorComuna({
  value,
  onChange,
  label = 'Comuna',
  required = false,
  disabled = false,
  error,
  placeholder = 'Buscar comuna...',
  id,
  className = '',
}: SelectorComunaProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listboxId = `${inputId}-listbox`;

  const [comunas, setComunas] = useState<ComunaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estados del selector
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Cargar catálogo de comunas con caché de sesión
  useEffect(() => {
    let mounted = true;
    async function cargar() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await getComunas();
        if (mounted && res?.data) {
          setComunas(res.data);
        }
      } catch (err) {
        console.error('[SelectorComuna] Error al cargar catálogo de comunas:', err);
        if (mounted) {
          setLoadError('No se pudo cargar la lista de comunas.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    cargar();
    return () => {
      mounted = false;
    };
  }, []);

  // Mantener searchTerm sincronizado si el value prop cambia externamente
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Filtrado reactivo sin tildes ni mayúsculas
  const resultados = useMemo(() => {
    return filtrarComunas(searchTerm, comunas);
  }, [searchTerm, comunas]);

  // Verificar si el valor actual pertenece al catálogo oficial
  const comunaOficialValida = useMemo(() => {
    if (!value || comunas.length === 0) return true;
    return Boolean(buscarComunaOficial(value, comunas));
  }, [value, comunas]);

  // Manejar clics fuera del componente para cerrar el dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        // Si se cerró sin seleccionar una opción, restaurar el texto al valor guardado
        setSearchTerm(value || '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [value]);

  // Asegurar que el elemento destacado esté a la vista al usar flechas
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleSelect = (item: ComunaItem) => {
    onChange(item.nombre, item.region);
    setSearchTerm(item.nombre);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < resultados.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : resultados.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < resultados.length) {
          handleSelect(resultados[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm(value || '');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm(value || '');
        break;
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-zinc-300"
        >
          {label} {required && <span className="text-amber-400">*</span>}
        </label>
      )}

      {/* Input container */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none flex items-center">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightedIndex >= 0 ? `${inputId}-opt-${highlightedIndex}` : undefined
          }
          autoComplete="off"
          disabled={disabled || loading}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full pl-10 pr-16 py-2.5 bg-zinc-950 border rounded-xl text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors ${
            error
              ? 'border-rose-500/80 focus:border-rose-400'
              : !comunaOficialValida
              ? 'border-amber-500/80 focus:border-amber-400'
              : 'border-zinc-800 focus:border-brand-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        {/* Botones a la derecha: Limpiar y Chevron */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded-md transition-colors"
              title="Borrar selección"
              aria-label="Borrar selección de comuna"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || loading}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded-md transition-colors"
            aria-label="Desplegar catálogo de comunas"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Alerta de datos viejos no presentes en el catálogo oficial */}
      {!comunaOficialValida && Boolean(value) && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-tight">
            El valor guardado <span className="font-semibold text-white">"{value}"</span> no coincide con una comuna oficial. Por favor selecciona una comuna válida del listado.
          </p>
        </div>
      )}

      {/* Error de carga de catálogo o validación */}
      {loadError && (
        <p className="text-[11px] text-rose-400">{loadError}</p>
      )}
      {error && (
        <p className="text-[11px] text-rose-400">{error}</p>
      )}

      {/* Dropdown flotante accesible */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="max-h-56 overflow-y-auto divide-y divide-zinc-800/60 py-1"
          >
            {resultados.length === 0 ? (
              <li className="px-3.5 py-3 text-xs text-zinc-400 text-center">
                No se encontraron comunas para "{searchTerm}"
              </li>
            ) : (
              resultados.map((comuna, idx) => {
                const isSelected =
                  normalizarTexto(comuna.nombre) === normalizarTexto(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={comuna.codigo}
                    id={`${inputId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(comuna)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isHighlighted
                        ? 'bg-brand-600/20 text-white'
                        : isSelected
                        ? 'bg-zinc-800/80 text-white'
                        : 'text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-baseline gap-1.5 truncate">
                      <span className="font-medium text-zinc-100">
                        {comuna.nombre}
                      </span>
                      <span className="text-[11px] text-zinc-400 truncate">
                        — {comuna.region}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-brand-400 shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

