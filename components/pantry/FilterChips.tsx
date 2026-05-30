// / pantry urgency filter
import { ScrollView } from 'react-native';

import type { PantrySection, PantrySectionKey } from '@domain/entities/group-pantry';
import { Chip } from '@ui/Chip';

export type PantryFilter = 'all' | PantrySectionKey;

export interface FilterChipsProps {
  readonly value: PantryFilter;
  readonly onChange: (next: PantryFilter) => void;
  readonly sections: PantrySection[];
}

export function FilterChips({ value, onChange, sections }: FilterChipsProps) {
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 pr-4"
    >
      <Chip
        label="All"
        count={total}
        active={value === 'all'}
        onPress={() => onChange('all')}
        accessibilityLabel={`All, ${total} items`}
      />
      {sections.map((section) => (
        <Chip
          key={section.key}
          label={section.title}
          tone={section.key}
          count={section.items.length}
          active={value === section.key}
          onPress={() => onChange(section.key)}
          accessibilityLabel={`${section.title}, ${section.items.length} items`}
        />
      ))}
    </ScrollView>
  );
}
