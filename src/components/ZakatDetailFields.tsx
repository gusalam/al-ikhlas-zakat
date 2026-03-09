import React, { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface DetailForm {
  fitrah: { enabled: boolean; jumlah_jiwa: string; harga_beras: string; jumlah_uang: string; jumlah_beras: string };
  mal: { enabled: boolean; jumlah_uang: string };
  infaq: { enabled: boolean; jumlah_uang: string };
  fidyah: { enabled: boolean; jumlah_uang: string; jumlah_beras: string };
}

export const emptyDetail = (): DetailForm => ({
  fitrah: { enabled: false, jumlah_jiwa: '1', harga_beras: '15000', jumlah_uang: '37500', jumlah_beras: '2.5' },
  mal: { enabled: false, jumlah_uang: '' },
  infaq: { enabled: false, jumlah_uang: '' },
  fidyah: { enabled: false, jumlah_uang: '', jumlah_beras: '' },
});

interface Props {
  detail: DetailForm;
  onChange: (updater: (prev: DetailForm) => DetailForm) => void;
  idPrefix?: string;
}

const FitrahFields = memo(function FitrahFields({
  fitrah,
  onToggle,
  onFieldChange,
  idPrefix,
}: {
  fitrah: DetailForm['fitrah'];
  onToggle: (v: boolean) => void;
  onFieldChange: (field: string, value: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id={`${idPrefix}-fitrah`} checked={fitrah.enabled} onCheckedChange={v => onToggle(!!v)} />
        <Label htmlFor={`${idPrefix}-fitrah`} className="cursor-pointer font-medium">Zakat Fitrah</Label>
      </div>
      {fitrah.enabled && (
        <Card className="border-primary/20 bg-primary/5 ml-6">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jumlah Jiwa <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  defaultValue={fitrah.jumlah_jiwa}
                  onBlur={e => onFieldChange('jumlah_jiwa', e.target.value)}
                  onChange={e => onFieldChange('jumlah_jiwa', e.target.value)}
                />
              </div>
              <div>
                <Label>Harga Beras/Kg (Rp)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  defaultValue={fitrah.harga_beras}
                  onBlur={e => onFieldChange('harga_beras', e.target.value)}
                  onChange={e => onFieldChange('harga_beras', e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {Number(fitrah.jumlah_jiwa) || 1} jiwa × 2,5 Kg × Rp {new Intl.NumberFormat('id-ID').format(Number(fitrah.harga_beras) || 0)} = <strong>Rp {new Intl.NumberFormat('id-ID').format(Number(fitrah.jumlah_uang) || 0)}</strong> | Beras: <strong>{fitrah.jumlah_beras} Kg</strong>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

const SimpleMoneyField = memo(function SimpleMoneyField({
  id,
  label,
  enabled,
  value,
  onToggle,
  onValueChange,
}: {
  id: string;
  label: string;
  enabled: boolean;
  value: string;
  onToggle: (v: boolean) => void;
  onValueChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id={id} checked={enabled} onCheckedChange={v => onToggle(!!v)} />
        <Label htmlFor={id} className="cursor-pointer font-medium">{label}</Label>
      </div>
      {enabled && (
        <div className="ml-6">
          <Label>Jumlah Uang (Rp) <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            defaultValue={value}
            key={`${id}-${enabled}`}
            onBlur={e => onValueChange(e.target.value)}
            onChange={e => onValueChange(e.target.value)}
            placeholder="0"
          />
        </div>
      )}
    </div>
  );
});

const FidyahFields = memo(function FidyahFields({
  fidyah,
  onToggle,
  onFieldChange,
  idPrefix,
}: {
  fidyah: DetailForm['fidyah'];
  onToggle: (v: boolean) => void;
  onFieldChange: (field: 'jumlah_uang' | 'jumlah_beras', value: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id={`${idPrefix}-fidyah`} checked={fidyah.enabled} onCheckedChange={v => onToggle(!!v)} />
        <Label htmlFor={`${idPrefix}-fidyah`} className="cursor-pointer font-medium">Fidyah</Label>
      </div>
      {fidyah.enabled && (
        <div className="ml-6 grid grid-cols-2 gap-3">
          <div>
            <Label>Jumlah Uang (Rp)</Label>
            <Input
              type="number"
              inputMode="numeric"
              defaultValue={fidyah.jumlah_uang}
              onBlur={e => onFieldChange('jumlah_uang', e.target.value)}
              onChange={e => onFieldChange('jumlah_uang', e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Jumlah Beras (Kg)</Label>
            <Input
              type="number"
              inputMode="numeric"
              defaultValue={fidyah.jumlah_beras}
              onBlur={e => onFieldChange('jumlah_beras', e.target.value)}
              onChange={e => onFieldChange('jumlah_beras', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      )}
    </div>
  );
});

function ZakatDetailFields({ detail, onChange, idPrefix = 'zdf' }: Props) {
  const toggleFitrah = useCallback((v: boolean) => {
    onChange(d => ({ ...d, fitrah: { ...d.fitrah, enabled: v } }));
  }, [onChange]);

  const updateFitrahField = useCallback((field: string, value: string) => {
    onChange(prev => {
      const f = { ...prev.fitrah, [field]: value };
      if (field === 'jumlah_jiwa' || field === 'harga_beras') {
        const jiwa = Number(field === 'jumlah_jiwa' ? value : f.jumlah_jiwa) || 1;
        const harga = Number(field === 'harga_beras' ? value : f.harga_beras) || 0;
        f.jumlah_beras = String(jiwa * 2.5);
        f.jumlah_uang = String(jiwa * 2.5 * harga);
      }
      return { ...prev, fitrah: f };
    });
  }, [onChange]);

  const toggleMal = useCallback((v: boolean) => {
    onChange(d => ({ ...d, mal: { ...d.mal, enabled: v } }));
  }, [onChange]);

  const updateMal = useCallback((v: string) => {
    onChange(d => ({ ...d, mal: { ...d.mal, jumlah_uang: v } }));
  }, [onChange]);

  const toggleInfaq = useCallback((v: boolean) => {
    onChange(d => ({ ...d, infaq: { ...d.infaq, enabled: v } }));
  }, [onChange]);

  const updateInfaq = useCallback((v: string) => {
    onChange(d => ({ ...d, infaq: { ...d.infaq, jumlah_uang: v } }));
  }, [onChange]);

  const toggleFidyah = useCallback((v: boolean) => {
    onChange(d => ({ ...d, fidyah: { ...d.fidyah, enabled: v } }));
  }, [onChange]);

  const updateFidyah = useCallback((field: 'jumlah_uang' | 'jumlah_beras', v: string) => {
    onChange(d => ({ ...d, fidyah: { ...d.fidyah, [field]: v } }));
  }, [onChange]);

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Jenis Zakat</Label>
      <FitrahFields fitrah={detail.fitrah} onToggle={toggleFitrah} onFieldChange={updateFitrahField} idPrefix={idPrefix} />
      <SimpleMoneyField id={`${idPrefix}-mal`} label="Zakat Mal" enabled={detail.mal.enabled} value={detail.mal.jumlah_uang} onToggle={toggleMal} onValueChange={updateMal} />
      <SimpleMoneyField id={`${idPrefix}-infaq`} label="Infaq" enabled={detail.infaq.enabled} value={detail.infaq.jumlah_uang} onToggle={toggleInfaq} onValueChange={updateInfaq} />
      <FidyahFields fidyah={detail.fidyah} onToggle={toggleFidyah} onFieldChange={updateFidyah} idPrefix={idPrefix} />
    </div>
  );
}

export default memo(ZakatDetailFields);
