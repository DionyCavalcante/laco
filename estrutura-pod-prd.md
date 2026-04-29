Você está trabalhando no projeto Laço, um CRM/agendador para clínicas de estética.

Contexto do produto:
O portal público de agendamento exibe páginas de procedimento para clientes vindas de WhatsApp/Instagram. A página atual de procedimento no frontend React/Vite já possui uma estética aprovada: identidade visual, fontes, cores, ícones, espaçamentos, cards, carrossel, animações e footer fixo com investimento e botões. Essa estética deve ser preservada.

Objetivo do PRD:
Criar um PRD para alterar a estrutura narrativa e o conteúdo da página de procedimento, mantendo a mesma identidade visual, componentes visuais e funcionamento atual.

Muito importante:
NÃO propor redesign visual.
NÃO trocar identidade visual.
NÃO mudar o estilo dos ícones.
NÃO remover o footer fixo de investimento.
NÃO mudar o comportamento do botão “Escolher meu horário”.
NÃO mudar o botão “Escolher outro procedimento” / “Ver outros procedimentos”.
NÃO mudar a estética do carrossel, cards, cores, fontes ou animações já existentes.
NÃO transformar a página em blog ou carta de vendas longa.

O que deve mudar:
A ordem e o conteúdo dos blocos dentro da página de procedimento para que ela fique mais persuasiva, objetiva e personalizada, usando a mesma estética atual.

Arquitetura atual relevante:
- Backend Express/PostgreSQL.
- Portal em React/Vite no arquivo frontend/agendador/src/App.tsx.
- A página de procedimento fica na OfferPage.
- Procedimentos já possuem campos:
  name
  description
  headline
  subheadline
  benefit_1_title
  benefit_1_desc
  benefit_2_title
  benefit_2_desc
  benefit_3_title
  benefit_3_desc
  price
  price_old
  payment_note
  photo_mode
- Fotos vêm de /api/upload/procedure/:id/photos com side before, after e carousel.
- A clínica vem de /api/portal/:slug com clinic.name.
- O cliente pode já estar identificado com clientName.
- O footer atual com investimento, loading/reveal, CTA principal e CTA secundário deve continuar funcionando como está.

Objetivo de negócio:
Aumentar a conversão da página de procedimento fazendo ela parecer uma conversa personalizada da clínica com a cliente, não um texto genérico ou blog.

Referência obrigatória de estrutura e tom:
O PRD deve usar o exemplo abaixo como referência principal de como a página final deve soar. Ele não é um texto genérico; é o padrão desejado de objetividade, persuasão e personalização.

Exemplo para Design de Sobrancelhas:

Design do olhar

{cliente_nome}, veja como o design de sobrancelhas na {clinica_nome} pode valorizar seu rosto sem deixar artificial

Para quem quer um olhar mais alinhado e sente que as sobrancelhas estão falhadas, sem formato ou pesando na expressão.

[Imagem principal do procedimento / resultado]

Na {clinica_nome}, cada design é pensado para respeitar o formato do seu rosto, seus fios naturais e o efeito que combina com você.

Mais harmonia no olhar
O desenho ajuda a equilibrar a expressão e destacar seus traços com sutileza.

Rosto mais arrumado no dia a dia
Sobrancelhas bem desenhadas deixam a aparência mais leve mesmo sem maquiagem.

Formato pensado para você
A profissional respeita seus fios, seu rosto e sua naturalidade antes de definir o desenho.

[Carrossel curto com 2 ou 3 imagens de resultados/referências do procedimento]

Referências de resultado para você visualizar estilos diferentes. O desenho ideal é definido individualmente para cada rosto.

Esse procedimento é para você se suas sobrancelhas estão desalinhadas, falhadas ou sem formato; se você quer realçar o olhar sem exagero; ou se quer se sentir mais arrumada na rotina, sem depender tanto da maquiagem.

Como funciona na {clinica_nome}: a profissional avalia o formato do seu rosto, observa seus fios naturais, define o desenho ideal e remove apenas o necessário para valorizar seus traços.

Dúvidas rápidas

Quanto tempo leva?
Em média, o design de sobrancelhas leva de 20 a 40 minutos, dependendo dos fios e do ajuste necessário.

Quanto tempo dura o resultado?
Geralmente, o resultado dura de 15 a 30 dias, variando conforme o crescimento dos seus fios.

Dói ou incomoda?
Pode haver um leve desconforto na retirada dos fios, mas costuma ser rápido e bem tolerado.

Quando preciso fazer manutenção?
A manutenção normalmente é feita a cada 15 a 30 dias para manter o desenho alinhado.

Antes de agendar, {cliente_nome}, vale lembrar: o objetivo não é mudar sua expressão. É realçar sua beleza com naturalidade, respeitando o limite dos seus fios e o estilo que combina com você.

Escolher meu horário

Comportamento esperado:
A página deve preservar a estética atual, mas reorganizar o conteúdo na seguinte estrutura curta:

1. Header/topo personalizado
- Categoria curta do procedimento
- Headline com nome da cliente e nome da clínica quando disponíveis
- Subheadline curta
- Imagem principal/carrossel atual mantido com a mesma estética

2. Frase de autoridade da clínica
Logo após a imagem principal ou como bloco curto dentro da estrutura atual:
Na {clinica_nome}, cada {procedimento} é pensado para respeitar {característica pessoal: rosto, pele, fios, corpo ou objetivo} e o efeito que combina com você.

3. Três benefícios rápidos
Manter o estilo visual dos cards atuais de benefícios e os ícones atuais ou equivalentes do mesmo estilo.
Cada card deve ter:
- título curto
- frase curta

4. Bloco de imagens extras/referências
Usar as imagens já carregadas do procedimento.
Se houver carousel/before/after suficientes, exibir referências extras sem mudar a estética visual geral.
O PRD deve avaliar como aproveitar o carrossel atual ou inserir um bloco compacto de imagens dentro da mesma linguagem visual.

Texto de apoio:
Referências de resultado para você visualizar estilos diferentes. O resultado ideal é definido individualmente.

5. Para quem é
Bloco curto, preferencialmente em texto corrido ou até 3 bullets.
Deve seguir a lógica:
Esse procedimento é para você se {dor}; se {desejo}; ou se {situação do dia a dia}.

6. Como funciona
Bloco objetivo:
Como funciona na {clinica_nome}: a profissional avalia {critério}, define {plano/desenho/técnica} e orienta os cuidados necessários.

7. FAQ curto / Dúvidas rápidas
Adicionar FAQ objetivo com 4 perguntas:
- Quanto tempo leva?
- Quanto tempo dura o resultado?
- Dói ou incomoda?
- Quando preciso fazer manutenção?

Se o procedimento não tiver manutenção, permitir trocar a última por:
- Quais cuidados preciso ter depois?

As respostas devem ser curtas, no máximo 1 ou 2 linhas.
O FAQ deve respeitar a estética atual dos cards/blocos da página.

8. Fechamento personalizado
Usar nome da cliente novamente se disponível.

Exemplo:
Antes de agendar, {cliente_nome}, vale lembrar: o objetivo não é mudar sua expressão. É realçar sua beleza com naturalidade, respeitando {limite/naturalidade/individualidade}.

9. Footer fixo atual
Manter o footer atual com:
- investimento
- price e price_old
- payment_note se aplicável
- botão principal “Escolher meu horário”
- botão secundário “Escolher outro procedimento” ou equivalente
- mesma cor, layout, altura, animação e comportamento

Regra central:
O PRD deve especificar que a implementação deve reutilizar o máximo possível dos componentes, classes, cores, ícones, animações e padrões já existentes na OfferPage. A mudança é de estrutura e conteúdo, não de design system.

Regras de copy:
- O texto deve ser curto, mobile-first e direto.
- Não deve parecer blog.
- Usar nome da cliente no máximo 2 vezes: headline e fechamento.
- Usar nome da clínica em 2 ou 3 pontos: headline, autoridade e como funciona.
- Evitar promessas absolutas como:
  “resultado garantido”
  “sem dor”
  “sem risco”
  “segurança máxima”
  “recuperação imediata”
- Preferir:
  “pode variar”
  “avaliação individual”
  “respeitando seus fios/pele/rosto/objetivo”
  “o efeito que combina com você”
- A página precisa parecer uma conversa premium da clínica com a cliente.

Campos de conteúdo:
O PRD deve analisar duas alternativas:

Alternativa A: MVP usando campos já existentes
- headline
- subheadline
- benefit_1_title
- benefit_1_desc
- benefit_2_title
- benefit_2_desc
- benefit_3_title
- benefit_3_desc
- description
- photos
- clinic.name
- clientName

Nesta alternativa, os blocos novos usam fallbacks automáticos e templates derivados do nome do procedimento.

Alternativa B: versão completa com novos campos no banco/API/admin
Sugerir novos campos por procedimento, como:
- category
- desired_result
- main_fear
- emotional_desire
- main_pain
- personal_characteristic
- authority_note
- fit_text ou fit_bullet_1/2/3
- how_it_works
- faq_session_duration
- faq_result_duration
- faq_pain_discomfort
- faq_maintenance
- faq_aftercare
- closing_note

O PRD deve recomendar uma abordagem incremental:
1. Primeiro implementar estrutura usando fallbacks e campos atuais.
2. Depois adicionar novos campos editáveis no admin/config para personalização por procedimento.

O PRD deve conter:
1. Resumo executivo
2. Problema
3. Objetivo
4. Não objetivos / restrições visuais
5. Público-alvo e contexto de uso
6. Estrutura narrativa da nova página
7. Requisitos funcionais
8. Requisitos de conteúdo/copy
9. Requisitos de personalização com clientName e clinicName
10. Requisitos de imagem
11. FAQ curto
12. Regras de fallback
13. Impacto em banco/API/admin
14. Requisitos de UX mobile-first
15. Critérios de aceite
16. Fora de escopo
17. Riscos
18. Plano de implementação em fases

Critérios de aceite obrigatórios:
- A página continua visualmente consistente com a OfferPage atual.
- O footer fixo de investimento permanece igual em visual e comportamento.
- O CTA principal continua levando para o fluxo de agendamento.
- O CTA secundário continua voltando para comparação/outros procedimentos.
- A estrutura nova aparece sem quebrar quando não há clientName.
- A estrutura nova aparece sem quebrar quando não há clinicName.
- A estrutura nova aparece sem quebrar quando não há fotos extras.
- A estrutura nova aparece sem quebrar quando não há campos novos.
- Os textos fallback não fazem promessas absolutas.
- A página continua curta e escaneável no mobile.
- O conteúdo parece personalizado para a clínica e cliente, não blog.
- Nenhuma mudança visual grande é proposta sem justificar explicitamente.

Gere o PRD em português, com linguagem clara, acionável e orientada à implementação.