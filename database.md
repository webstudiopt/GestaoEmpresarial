## Table `servicos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `nome` | `text` |  |
| `categoria` | `text` |  |
| `preco` | `numeric` |  |
| `minutos` | `int4` |  |
| `material` | `numeric` |  |
| `descricao` | `text` |  |
| `no_catalogo` | `bool` |  |
| `ordem` | `int4` |  |
| `tipo_preco` | `text` |  |
| `prazo_retorno_dias` | `int4` |  Nullable |
| `minimo_fios_pct` | `int4` |  Nullable |
| `regra` | `text` |  |
| `ativo` | `bool` |  |

## Table `custos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `nome` | `text` |  |
| `valor` | `numeric` |  |
| `ordem` | `int4` |  |
| `pro_labore` | `bool` |  |

## Table `atendimentos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `data` | `date` |  |
| `cliente` | `text` |  |
| `servico_id` | `uuid` |  Nullable |
| `servico_nome` | `text` |  |
| `categoria` | `text` |  |
| `valor` | `numeric` |  |
| `minutos` | `int4` |  |
| `material` | `numeric` |  |
| `pagamento` | `text` |  |
| `obs` | `text` |  |
| `criado_em` | `timestamptz` |  |
| `cliente_id` | `uuid` |  Nullable |
| `taxa_repassada` | `numeric` |  |

## Table `reserva`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `data` | `date` |  |
| `descricao` | `text` |  |
| `valor` | `numeric` |  |
| `reserva_id` | `uuid` |  |

## Table `historico`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `mes` | `text` |  |
| `total` | `numeric` |  |

## Table `config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `imposto` | `numeric` |  |
| `taxa_cartao` | `numeric` |  |
| `horas_mes` | `int4` |  |
| `lucro_alvo` | `numeric` |  |
| `meta_mes` | `numeric` |  |
| `meta_reserva` | `numeric` |  |
| `licenca` | `date` |  Nullable |
| `politicas` | `text` |  |

## Table `reservas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `nome` | `text` |  |
| `meta` | `numeric` |  |
| `data_alvo` | `date` |  |
| `ordem` | `int4` |  |

## Table `clientes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `nome` | `text` |  |
| `telefone` | `text` |  |
| `preco_especial` | `bool` |  |
| `obs` | `text` |  |
| `criado_em` | `timestamptz` |  |

## Table `categorias_despesa`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `nome` | `text` |  |
| `escopo` | `text` |  |
| `tipo` | `text` |  |
| `cor` | `text` |  |
| `ordem` | `int4` |  |
| `no_teto` | `bool` |  |

## Table `faturas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `cartao` | `text` |  |
| `escopo` | `text` |  |
| `mes_referencia` | `date` |  |
| `fechamento` | `date` |  Nullable |
| `vencimento` | `date` |  Nullable |
| `valor_total` | `numeric` |  |
| `paga` | `bool` |  |
| `paga_em` | `date` |  Nullable |
| `obs` | `text` |  |

## Table `despesas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `escopo` | `text` |  |
| `categoria_id` | `uuid` |  Nullable |
| `descricao` | `text` |  |
| `valor` | `numeric` |  |
| `data` | `date` |  |
| `forma_pagamento` | `text` |  |
| `fatura_id` | `uuid` |  Nullable |
| `recorrente` | `bool` |  |
| `parcela_atual` | `int4` |  Nullable |
| `parcelas_total` | `int4` |  Nullable |
| `pago` | `bool` |  |
| `obs` | `text` |  |
| `criado_em` | `timestamptz` |  |

## Table `receitas_sala`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `locatario` | `text` |  |
| `descricao` | `text` |  |
| `valor` | `numeric` |  |
| `competencia` | `date` |  |
| `vencimento` | `date` |  Nullable |
| `recebido` | `bool` |  |
| `recebido_em` | `date` |  Nullable |
| `recorrente` | `bool` |  |
| `obs` | `text` |  |

## Table `metas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `escopo` | `text` |  |
| `nome` | `text` |  |
| `tipo` | `text` |  |
| `valor_alvo` | `numeric` |  |
| `valor_atual` | `numeric` |  |
| `categoria_id` | `uuid` |  Nullable |
| `data_inicio` | `date` |  |
| `prazo` | `date` |  Nullable |
| `concluida` | `bool` |  |
| `obs` | `text` |  |

## Table `plano_tarefas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `semana` | `date` |  |
| `foco` | `text` |  |
| `tarefa` | `text` |  |
| `feito` | `bool` |  |
| `feito_em` | `date` |  Nullable |
| `ordem` | `int4` |  |

## Table `plano_mensagens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `titulo` | `text` |  |
| `texto` | `text` |  |
| `ordem` | `int4` |  |

## Table `plano_conteudos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `tipo` | `text` |  |
| `ideia` | `text` |  |
| `formato` | `text` |  |
| `publicado` | `bool` |  |
| `publicado_em` | `date` |  Nullable |
| `ordem` | `int4` |  |

## Table `produtos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `nome` | `text` |  |
| `custo` | `numeric` |  |
| `preco` | `numeric` |  |
| `estoque` | `int4` |  |
| `ativo` | `bool` |  |
| `ordem` | `int4` |  |

## Table `vendas_produto`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `data` | `date` |  |
| `produto_id` | `uuid` |  Nullable |
| `produto_nome` | `text` |  |
| `cliente_id` | `uuid` |  Nullable |
| `quantidade` | `int4` |  |
| `valor` | `numeric` |  |
| `custo` | `numeric` |  |
| `pagamento` | `text` |  |
| `criado_em` | `timestamptz` |  |

## Table `agenda_visitas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `evento_id` | `text` |  |
| `data` | `date` |  |
| `hora` | `time` |  Nullable |
| `titulo` | `text` |  |
| `cliente_nome` | `text` |  |
| `telefone` | `text` |  |
| `cliente_chave` | `text` |  |
| `ignorar` | `bool` |  |

## RLS Policies

### `clientes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `clientes_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `clientes_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `clientes_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `clientes_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `categorias_despesa`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `categorias_despesa_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `categorias_despesa_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `categorias_despesa_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `categorias_despesa_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `faturas`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `faturas_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `faturas_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `faturas_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `faturas_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `despesas`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `despesas_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `despesas_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `despesas_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `despesas_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `receitas_sala`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `receitas_sala_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `receitas_sala_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `receitas_sala_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `receitas_sala_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `metas`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `metas_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `metas_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `metas_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `metas_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `historico`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `historico_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `historico_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `historico_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `historico_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `config`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `config_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `config_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `config_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `config_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `reserva`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `reserva_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `reserva_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `reserva_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `reserva_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `servicos`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `servicos_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `servicos_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `servicos_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `servicos_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `reservas`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `reservas_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `reservas_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `reservas_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `reservas_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `custos`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `custos_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `custos_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `custos_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `custos_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `atendimentos`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `atendimentos_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `atendimentos_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `atendimentos_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `atendimentos_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `plano_tarefas`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `plano_tarefas_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `plano_tarefas_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `plano_tarefas_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `plano_tarefas_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `plano_mensagens`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `plano_mensagens_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `plano_mensagens_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `plano_mensagens_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `plano_mensagens_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `plano_conteudos`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `plano_conteudos_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `plano_conteudos_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `plano_conteudos_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `plano_conteudos_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `produtos`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `produtos_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `produtos_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `produtos_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `produtos_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `vendas_produto`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `vendas_produto_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `vendas_produto_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `vendas_produto_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `vendas_produto_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

### `agenda_visitas`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `agenda_visitas_delete` | DELETE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `agenda_visitas_insert` | INSERT | authenticated | PERMISSIVE | — | `(user_id = ( SELECT auth.uid() AS uid))` |
| `agenda_visitas_select` | SELECT | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | — |
| `agenda_visitas_update` | UPDATE | authenticated | PERMISSIVE | `(user_id = ( SELECT auth.uid() AS uid))` | `(user_id = ( SELECT auth.uid() AS uid))` |

