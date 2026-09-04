import { useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AbInput } from './ab-input';
import { cn } from '@/lib/utils';

interface AbDynamicTagsProps {
  value: string[];
  disabled?: boolean;
  onChange?: (value: string[]) => void;
}

export function AbDynamicTags({
  value,
  disabled = false,
  onChange,
}: AbDynamicTagsProps) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const tag = input.trim();
    if (tag && !value.includes(tag)) {
      onChange?.([...value, tag]);
    }
    setInput('');
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      {value.map((tag) => (
        <span
          key={tag}
          className={cn(
            'bg-muted text-foreground inline-flex min-h-6 items-center gap-1 rounded-full px-2 py-0.5 text-xs',
            disabled && 'opacity-50',
          )}
        >
          {tag}
          {!disabled && (
            <button
              aria-label={`remove ${tag}`}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              onClick={() => onChange?.(value.filter((t) => t !== tag))}
            >
              <X size={12} />
            </button>
          )}
        </span>
      ))}

      {editing ? (
        <AbInput
          ref={inputRef}
          variant="tag"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit();
            }
            if (e.key === 'Backspace' && input === '' && value.length > 0) {
              onChange?.(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            commit();
            setEditing(false);
          }}
        />
      ) : (
        !disabled && (
          <Button
            variant="outline"
            size="icon-xs"
            className="rounded-md border-dashed"
            aria-label="add tag"
            onClick={() => {
              setEditing(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            <Plus size={12} />
          </Button>
        )
      )}
    </div>
  );
}
