interface Props {
  value: number | null;
  forms: any[];
  onChange: (formId: number | null) => void;
}

export default function FormPicker({ value, forms, onChange }: Props) {
  const collectibleForms = forms.filter((f: any) => f.is_collectible);
  if (collectibleForms.length <= 1) return null;

  return (
    <div className="px-3 py-2">
      <div className="text-2xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-1.5">Form</div>
      <div className="flex gap-1.5 flex-wrap">
        {collectibleForms.map((form: any) => (
          <button
            key={form.id}
            type="button"
            onClick={() => onChange(form.id === value ? null : form.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              value === form.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-surface-raised text-muted-foreground hover:bg-surface-sunken'
            }`}
          >
            <img src={form.sprite_url} alt={form.form_name} className="w-5 h-5 [image-rendering:pixelated]" />
            {form.form_name}
          </button>
        ))}
      </div>
    </div>
  );
}
