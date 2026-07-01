import { cn } from '../utils';

interface JustLogoProps {
  variant?: 'navy' | 'white';
  /** Altura visível do lettering em px (padrão 28). */
  heightPx?: number;
  className?: string;
}

/**
 * Logo oficial da Construtora JUST (arte aprovada em `public/`).
 *  - variant="navy"  → marca azul-marinho (sobre fundo claro).
 *  - variant="white" → marca branca (sobre fundo navy/escuro).
 * A arte (8000×4500) tem bastante respiro vertical; o container recorta esse padding
 * para o lettering "JUST / CONSTRUTORA" aparecer na altura pedida (`heightPx`).
 */
export function JustLogo({ variant = 'navy', heightPx = 28, className }: JustLogoProps) {
  const src = variant === 'white' ? '/just-logo-white.png' : '/just-logo-navy.png';
  return (
    <span
      className={cn('inline-flex items-center justify-center overflow-hidden', className)}
      style={{ height: heightPx }}
    >
      <img
        src={src}
        alt="Construtora JUST"
        draggable={false}
        className="w-auto max-w-none object-contain select-none"
        style={{ height: heightPx * 2.4 }}
      />
    </span>
  );
}
