import type { ComponentProps } from 'react';
import { focusRing } from '@/components/styles';

type SwitchProps = Omit<ComponentProps<'input'>, 'type' | 'role'>;

// A native checkbox styled as a switch. role="switch" makes screen readers
// announce it as on/off; Space toggles it and it submits with forms, natively.
export function Switch({ className = '', ...props }: SwitchProps) {
  return (
    <input
      type='checkbox'
      role='switch'
      className={`relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-5 before:rounded-full before:bg-white before:shadow-sm before:transition-transform checked:bg-aqua-700 checked:before:translate-x-5 disabled:cursor-wait disabled:opacity-60 ${focusRing} ${className}`}
      {...props}
    />
  );
}
