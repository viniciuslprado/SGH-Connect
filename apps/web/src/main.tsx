import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { FalhaApi } from './shared/api';
import { ProvedorAuth } from './shared/auth';
import { ProvedorConfirmacao } from './shared/ui';
import './styles.css';

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      // Não insiste em erros de regra/permissão (4xx); tenta de novo só em falhas de rede/servidor.
      retry: (tentativas, erro) => !(erro instanceof FalhaApi && erro.status >= 400 && erro.status < 500) && tentativas < 2,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <BrowserRouter>
        <ProvedorAuth>
          <ProvedorConfirmacao>
            <App />
          </ProvedorConfirmacao>
        </ProvedorAuth>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
