import React from 'react';
import type { Aura } from '../../lib/aura';

interface AuraFieldProps {
  aura: Aura;
  isStar: boolean;
}

function AuraFieldImpl(_props: AuraFieldProps) {
  return null;
}

export const AuraField = React.memo(AuraFieldImpl);
