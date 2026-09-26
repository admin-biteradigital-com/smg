import { useState, useEffect } from 'react';
import {
  getClientesSyncDiscrepancia,
  type ClientesDiscrepanciaInfo,
} from '@/lib/sync';

/**
 * Hook para observar reactivamente si existe una discrepancia detectada
 * entre el servidor (0 clientes) y la caché local Dexie (N > 0 clientes).
 */
export function useClientesDiscrepancia(): ClientesDiscrepanciaInfo | null {
  const [discrepancia, setDiscrepancia] = useState<ClientesDiscrepanciaInfo | null>(
    getClientesSyncDiscrepancia
  );

  useEffect(() => {
    const handleUpdate = () => {
      setDiscrepancia(getClientesSyncDiscrepancia());
    };

    window.addEventListener('siglo-clientes-discrepancia-change', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    handleUpdate();

    return () => {
      window.removeEventListener('siglo-clientes-discrepancia-change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return discrepancia;
}
