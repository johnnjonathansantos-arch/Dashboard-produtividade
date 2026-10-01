// Dados extraídos das planilhas Jira e Multi360 — Julho, Agosto e Setembro 2026
// Estrutura: cada entrada tem um campo "mes" para filtragem ("Julho 2026", "Agosto 2026", "Setembro 2026")

const jiraData = [
  // ===== JULHO 2026 =====
  { "ticket": "SAC-4185", "titulo": "CAP - Mudança de portal para emissão de NF", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "CAP", "classe": "A", "criado": "10/07/2026 15:43", "tempo": "22:50", "mes": "Julho 2026" },
  { "ticket": "SAC-4174", "titulo": "Hospital de Amor - arquivo de bloco de revisão", "tipo": "Incidente", "status": "Concluido", "cliente": "Hospital de Amor", "classe": "B", "criado": "09/07/2026 17:27", "tempo": "29:03", "mes": "Julho 2026" },
  { "ticket": "SAC-4172", "titulo": "HE - Relatórios da qualidade", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "HE", "classe": "B", "criado": "09/07/2026 10:50", "tempo": "10:46", "mes": "Julho 2026" },
  { "ticket": "SAC-4165", "titulo": "LABHE - LAUDO BIOMOL HPV28", "tipo": "Incidente", "status": "Concluido", "cliente": "HE", "classe": "B", "criado": "08/07/2026 10:52", "tempo": "5:37", "mes": "Julho 2026" },
  { "ticket": "SAC-4154", "titulo": "Micro - Solicitações no arquivo sumindo", "tipo": "Dúvida", "status": "Concluido", "cliente": "Micro", "classe": "C", "criado": "07/07/2026 11:51", "tempo": "25:17", "mes": "Julho 2026" },
  { "ticket": "SAC-4136", "titulo": "HE - ERRO EM CBO VERSÃO NOVA", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "HE", "classe": "B", "criado": "06/07/2026 07:16", "tempo": "17:37", "mes": "Julho 2026" },
  { "ticket": "SAC-4134", "titulo": "Cedapi - Campo CBOS na Guia SADT", "tipo": "Incidente", "status": "Concluido", "cliente": "Cedapi", "classe": "B", "criado": "03/07/2026 14:51", "tempo": "—", "mes": "Julho 2026" },
  { "ticket": "SAC-4132", "titulo": "Spac - ATUALIZAÇÃO VERSÃO TISS XML", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "SPAC", "classe": "B", "criado": "03/07/2026 09:03", "tempo": "31:20", "mes": "Julho 2026" },
  { "ticket": "SAC-4103", "titulo": "Apoiolab - Ajustes de laudo", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "Apoiolab", "classe": "B", "criado": "30/06/2026 11:03", "tempo": "7:11", "mes": "Julho 2026" },
  { "ticket": "SAC-4092", "titulo": "AC Camargo - Criação de paciente duplicados na apLIS", "tipo": "Incidente", "status": "Concluido", "cliente": "AC Camargo", "classe": "A", "criado": "26/06/2026 15:59", "tempo": "28:48", "mes": "Julho 2026" },
  { "ticket": "SAC-4090", "titulo": "DAP - Pedido de procedimento especial", "tipo": "Customização", "status": "Concluido", "cliente": "DAP", "classe": "B", "criado": "26/06/2026 11:18", "tempo": "28:55", "mes": "Julho 2026" },
  { "ticket": "SAC-4080", "titulo": "Apoiolab - Ajustes de laudo", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "Apoiolab", "classe": "B", "criado": "25/06/2026 15:15", "tempo": "12:12", "mes": "Julho 2026" },
  { "ticket": "SAC-4050", "titulo": "Infolaudo - Verssão TISS", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "Infolaudo", "classe": "A", "criado": "22/06/2026 14:27", "tempo": "31:38", "mes": "Julho 2026" },
  { "ticket": "SAC-4043", "titulo": "HSL - Relatório de blocos não arquivados e arquivamento incompleto", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "HSL", "classe": "A", "criado": "22/06/2026 08:33", "tempo": "31:00", "mes": "Julho 2026" },
  { "ticket": "SAC-4042", "titulo": "IPCM - Novo endpoint da API, FaturementoLoteListar", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "IPCM", "classe": "A", "criado": "22/06/2026 08:31", "tempo": "25:53", "mes": "Julho 2026" },
  { "ticket": "SAC-4040", "titulo": "AC Camargo - API - Dra Adriana - Estimativa", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "AC Camargo", "classe": "A", "criado": "22/06/2026 08:30", "tempo": "23:29", "mes": "Julho 2026" },
  { "ticket": "SAC-4039", "titulo": "HSL - Exames cancelados na integração ficando na lista médica na microscopia", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "HSL", "classe": "A", "criado": "22/06/2026 08:29", "tempo": "30:23", "mes": "Julho 2026" },
  { "ticket": "SAC-4035", "titulo": "Apoiolab - Correção de retorno do RTF no endpoint requisicaoResultado", "tipo": "Solicitação de serviço", "status": "Concluido", "cliente": "Apoiolab", "classe": "A", "criado": "22/06/2026 08:05", "tempo": "16:00", "mes": "Julho 2026" },
