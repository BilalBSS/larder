-- households currency

alter table households
  add column if not exists currency text not null default 'GBP' check (char_length(currency) = 3);
