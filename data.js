// Dados extraídos das planilhas Jira e Multi - Julho 2026
const jiraData = [
  {
    "ticket": "SAC-4185",
    "titulo": "CAP - Mudança de portal para emissão de NF",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "CAP",
    "classe": "A",
    "criado": "10/07/2026 15:43",
    "concluido": "14/07/2026 17:05",
    "tempo": "22:50"
  },
  {
    "ticket": "SAC-4174",
    "titulo": "Hospital de Amor - arquivo de bloco de revisão",
    "tipo": "Incidente",
    "status": "Concluido",
    "cliente": "Hospital de Amor",
    "classe": "B",
    "criado": "09/07/2026 17:27",
    "concluido": "20/07/2026 08:38",
    "tempo": "29:03"
  },
  {
    "ticket": "SAC-4172",
    "titulo": "HE - Relatórios da qualidade",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "HE",
    "classe": "B",
    "criado": "09/07/2026 10:50",
    "concluido": "20/07/2026 15:20",
    "tempo": "10:46"
  },
  {
    "ticket": "SAC-4165",
    "titulo": "LABHE - LAUDO BIOMOL HPV28",
    "tipo": "Incidente",
    "status": "Concluido",
    "cliente": "HE",
    "classe": "B",
    "criado": "08/07/2026 10:52",
    "concluido": "24/07/2026 12:05",
    "tempo": "5:37"
  },
  {
    "ticket": "SAC-4154",
    "titulo": "Micro - Solicitações no arquivo sumindo",
    "tipo": "Dúvida",
    "status": "Concluido",
    "cliente": "Micro",
    "classe": "C",
    "criado": "07/07/2026 11:51",
    "concluido": "08/07/2026 10:34",
    "tempo": "25:17"
  },
  {
    "ticket": "SAC-4136",
    "titulo": "HE - ERRO EM CBO VERSÃO NOVA",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "HE",
    "classe": "B",
    "criado": "06/07/2026 07:16",
    "concluido": "08/07/2026 11:46",
    "tempo": "17:37"
  },
  {
    "ticket": "SAC-4134",
    "titulo": "Cedapi - Campo CBOS na Guia SADT",
    "tipo": "Incidente",
    "status": "Concluido",
    "cliente": "Cedapi",
    "classe": "B",
    "criado": "03/07/2026 14:51",
    "concluido": "10/07/2026 08:05",
    "tempo": "-0:12"
  },
  {
    "ticket": "SAC-4132",
    "titulo": "Spac - ATUALIZAÇÃO VERSÃO TISS XML",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "SPAC",
    "classe": "B",
    "criado": "03/07/2026 09:03",
    "concluido": "03/07/2026 12:12",
    "tempo": "31:20"
  },
  {
    "ticket": "SAC-4103",
    "titulo": "Apoiolab - Ajustes de laudo",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "Apoiolab",
    "classe": "B",
    "criado": "30/06/2026 11:03",
    "concluido": "07/07/2026 15:19",
    "tempo": "7:11"
  },
  {
    "ticket": "SAC-4092",
    "titulo": "AC Camargo - Criação de paciente duplicados na apLIS",
    "tipo": "Incidente",
    "status": "Concluido",
    "cliente": "AC Camargo",
    "classe": "A",
    "criado": "26/06/2026 15:59",
    "concluido": "29/06/2026 11:11",
    "tempo": "28:48"
  },
  {
    "ticket": "SAC-4090",
    "titulo": "DAP - Pedido de procedimento especial",
    "tipo": "Customização",
    "status": "Concluido",
    "cliente": "DAP",
    "classe": "B",
    "criado": "26/06/2026 11:18",
    "concluido": "10/07/2026 11:55",
    "tempo": "28:55"
  },
  {
    "ticket": "SAC-4080",
    "titulo": "Apoiolab - Ajustes de laudo",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "Apoiolab",
    "classe": "B",
    "criado": "25/06/2026 15:15",
    "concluido": "30/06/2026 11:02",
    "tempo": "12:12"
  },
  {
    "ticket": "SAC-4050",
    "titulo": "Infolaudo - Verssão TISS",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "Infolaudo",
    "classe": "A",
    "criado": "22/06/2026 14:27",
    "concluido": "22/06/2026 14:48",
    "tempo": "31:38"
  },
  {
    "ticket": "SAC-4043",
    "titulo": "HSL - Relatório de blocos não arquivados e arquivamento incompleto",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "Aplis",
    "classe": "A",
    "criado": "22/06/2026 08:33",
    "concluido": "22/06/2026 09:59",
    "tempo": "31:00"
  },
  {
    "ticket": "SAC-4042",
    "titulo": "IPCM - Novo endpoint da API, FaturementoLoteListar",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "Aplis",
    "classe": "A",
    "criado": "22/06/2026 08:31",
    "concluido": "22/06/2026 15:50",
    "tempo": "25:53"
  },
  {
    "ticket": "SAC-4040",
    "titulo": "AC Camargo - API - Dra Adriana - Estimativa",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "Aplis",
    "classe": "A",
    "criado": "22/06/2026 08:30",
    "concluido": "23/06/2026 10:08",
    "tempo": "23:29"
  },
  {
    "ticket": "SAC-4039",
    "titulo": "HSL - Exames cancelados na integração ficando na lista médica na microscopia",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "Aplis",
    "classe": "A",
    "criado": "22/06/2026 08:29",
    "concluido": "22/06/2026 10:36",
    "tempo": "30:23"
  },
  {
    "ticket": "SAC-4035",
    "titulo": "Apoiolab - Correção de retorno do RTF no endpoint requisicaoResultado",
    "tipo": "Solicitação de serviço",
    "status": "Concluido",
    "cliente": "Aplis",
    "classe": "A",
    "criado": "22/06/2026 08:05",
    "concluido": "30/06/2026 11:02",
    "tempo": "16:00"
  }
];

const multiData = [
  {
    "protocolo": "573164214",
    "motivo": "Resolução de dúvida",
    "nome": "São Lucas - Patrícia",
    "avaliacao": 10.0,
    "data": "31/07/2026 15:17"
  },
  {
    "protocolo": "573161440",
    "motivo": "Resolução de dúvida",
    "nome": "Infolaudo - Sabrina",
    "avaliacao": null,
    "data": "31/07/2026 15:10"
  },
  {
    "protocolo": "573101179",
    "motivo": "Encaminhado para o JIRA",
    "nome": "Lab HE - Dr. Yuri",
    "avaliacao": null,
    "data": "31/07/2026 12:30"
  },
  {
    "protocolo": "573098458",
    "motivo": "Resolução de dúvida",
    "nome": "Cedapi - Viviane",
    "avaliacao": 10.0,
    "data": "31/07/2026 12:21"
  },
  {
    "protocolo": "573052942",
    "motivo": "Parametrização",
    "nome": "IPCM - Bruna",
    "avaliacao": null,
    "data": "31/07/2026 10:42"
  },
  {
    "protocolo": "572905775",
    "motivo": "Resolução de dúvida",
    "nome": "Ampliar - Norma",
    "avaliacao": null,
    "data": "30/07/2026 16:06"
  },
  {
    "protocolo": "572892593",
    "motivo": "Resolução de dúvida",
    "nome": "Cedapi - Fagner",
    "avaliacao": null,
    "data": "30/07/2026 15:34"
  },
  {
    "protocolo": "572878362",
    "motivo": "Resolução de dúvida",
    "nome": "Spac - Allan",
    "avaliacao": null,
    "data": "30/07/2026 15:02"
  },
  {
    "protocolo": "572809214",
    "motivo": "Encaminhado para o JIRA",
    "nome": "Cedapi - Fagner",
    "avaliacao": null,
    "data": "30/07/2026 12:00"
  },
  {
    "protocolo": "572806931",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "Biogenar- dra Elaine",
    "avaliacao": null,
    "data": "30/07/2026 11:54"
  },
  {
    "protocolo": "572726760",
    "motivo": "Resolução de dúvida",
    "nome": "Multipat - Adrielle",
    "avaliacao": null,
    "data": "30/07/2026 09:18"
  },
  {
    "protocolo": "572709642",
    "motivo": "Parametrização",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "30/07/2026 08:43"
  },
  {
    "protocolo": "572591479",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "29/07/2026 15:01"
  },
  {
    "protocolo": "572539292",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "29/07/2026 12:55"
  },
  {
    "protocolo": "572527297",
    "motivo": "Resolução de dúvida",
    "nome": "Cepatho - Angela Santos",
    "avaliacao": null,
    "data": "29/07/2026 12:19"
  },
  {
    "protocolo": "572516075",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene -  Gabriela",
    "avaliacao": null,
    "data": "29/07/2026 11:50"
  },
  {
    "protocolo": "572515783",
    "motivo": "Resolução de dúvida",
    "nome": "Raquel - Patogene",
    "avaliacao": null,
    "data": "29/07/2026 11:49"
  },
  {
    "protocolo": "572511987",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Raquel",
    "avaliacao": null,
    "data": "29/07/2026 11:41"
  },
  {
    "protocolo": "572412189",
    "motivo": "Resolução de dúvida",
    "nome": "Scapulatempo - Luciana",
    "avaliacao": null,
    "data": "29/07/2026 08:31"
  },
  {
    "protocolo": "572368279",
    "motivo": "Problemas não atribuído ao sistema",
    "nome": "Marta - indap",
    "avaliacao": null,
    "data": "28/07/2026 18:12"
  },
  {
    "protocolo": "572367250",
    "motivo": "Problemas não atribuído ao sistema",
    "nome": "Indap - Camila",
    "avaliacao": null,
    "data": "28/07/2026 18:06"
  },
  {
    "protocolo": "572294989",
    "motivo": "Resolução de dúvida",
    "nome": "Infolaudo - Arthur",
    "avaliacao": 10.0,
    "data": "28/07/2026 15:01"
  },
  {
    "protocolo": "572280786",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "28/07/2026 14:31"
  },
  {
    "protocolo": "572254739",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "28/07/2026 13:34"
  },
  {
    "protocolo": "572234193",
    "motivo": "Resolução de dúvida",
    "nome": "Cedapi - Viviane",
    "avaliacao": null,
    "data": "28/07/2026 12:37"
  },
  {
    "protocolo": "572233629",
    "motivo": "Parametrização",
    "nome": "Patologika -  José",
    "avaliacao": null,
    "data": "28/07/2026 12:36"
  },
  {
    "protocolo": "572210123",
    "motivo": "Resolução de dúvida",
    "nome": "Infolaudo - Dra. Fernanda",
    "avaliacao": null,
    "data": "28/07/2026 11:39"
  },
  {
    "protocolo": "572174527",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "Cepatho - Jéssyca",
    "avaliacao": null,
    "data": "28/07/2026 10:35"
  },
  {
    "protocolo": "572111328",
    "motivo": "Resolução de dúvida",
    "nome": "Acta - Atendimento",
    "avaliacao": 10.0,
    "data": "28/07/2026 08:55"
  },
  {
    "protocolo": "572096726",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "28/07/2026 08:30"
  },
  {
    "protocolo": "571972529",
    "motivo": "Resolução de dúvida",
    "nome": "IPCM - Rodrigo",
    "avaliacao": null,
    "data": "27/07/2026 15:07"
  },
  {
    "protocolo": "571847675",
    "motivo": "Resolução de dúvida",
    "nome": "Lab - Raquel",
    "avaliacao": null,
    "data": "27/07/2026 10:40"
  },
  {
    "protocolo": "571571292",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "Infolaudo - Sabrina",
    "avaliacao": null,
    "data": "24/07/2026 16:04"
  },
  {
    "protocolo": "571495098",
    "motivo": "Resolução de dúvida",
    "nome": "ID - Thiago",
    "avaliacao": null,
    "data": "24/07/2026 12:40"
  },
  {
    "protocolo": "571392187",
    "motivo": "Resolução de dúvida",
    "nome": "Evelim - Patogene",
    "avaliacao": 10.0,
    "data": "24/07/2026 08:57"
  },
  {
    "protocolo": "571388504",
    "motivo": "Resolução de dúvida",
    "nome": "INDAP - Thiago",
    "avaliacao": 10.0,
    "data": "24/07/2026 08:49"
  },
  {
    "protocolo": "571285227",
    "motivo": "Resolução de dúvida",
    "nome": "Cepam - Andressa",
    "avaliacao": 9.0,
    "data": "23/07/2026 15:31"
  },
  {
    "protocolo": "571260563",
    "motivo": "Problemas não atribuído ao sistema",
    "nome": "",
    "avaliacao": null,
    "data": "23/07/2026 14:36"
  },
  {
    "protocolo": "571228133",
    "motivo": "Bug - Desenvolvimento",
    "nome": "Ampliar -  Antonia",
    "avaliacao": null,
    "data": "23/07/2026 13:14"
  },
  {
    "protocolo": "571217990",
    "motivo": "Bug - Desenvolvimento",
    "nome": "DIAC - Renan",
    "avaliacao": null,
    "data": "23/07/2026 12:42"
  },
  {
    "protocolo": "571214878",
    "motivo": "Bug - Desenvolvimento",
    "nome": "Cepatho - Angela",
    "avaliacao": null,
    "data": "23/07/2026 12:33"
  },
  {
    "protocolo": "571202734",
    "motivo": "Bug - Desenvolvimento",
    "nome": "Micro - Patrik",
    "avaliacao": 10.0,
    "data": "23/07/2026 11:59"
  },
  {
    "protocolo": "571202072",
    "motivo": "Resolução de dúvida",
    "nome": "IPCM - Rodrigo",
    "avaliacao": null,
    "data": "23/07/2026 11:57"
  },
  {
    "protocolo": "571198928",
    "motivo": "Parametrização",
    "nome": "Cap - Lena",
    "avaliacao": null,
    "data": "23/07/2026 11:50"
  },
  {
    "protocolo": "571198061",
    "motivo": "Bug - Desenvolvimento",
    "nome": "HE - Jakson",
    "avaliacao": 10.0,
    "data": "23/07/2026 11:48"
  },
  {
    "protocolo": "571197823",
    "motivo": "Parametrização",
    "nome": "DIAC - Elane",
    "avaliacao": null,
    "data": "23/07/2026 11:48"
  },
  {
    "protocolo": "571196860",
    "motivo": "Resolução de dúvida",
    "nome": "MD - Tais Souza",
    "avaliacao": 10.0,
    "data": "23/07/2026 11:45"
  },
  {
    "protocolo": "571196650",
    "motivo": "Resolução de dúvida",
    "nome": "Anátomo - Kamilla",
    "avaliacao": null,
    "data": "23/07/2026 11:45"
  },
  {
    "protocolo": "571193944",
    "motivo": "Parametrização",
    "nome": "Infolaudo - Arthur",
    "avaliacao": null,
    "data": "23/07/2026 11:39"
  },
  {
    "protocolo": "571193918",
    "motivo": "Resolução de dúvida",
    "nome": "Karine - Diprever",
    "avaliacao": 10.0,
    "data": "23/07/2026 11:39"
  },
  {
    "protocolo": "571179168",
    "motivo": "Resolução de dúvida",
    "nome": "DIAC - Elane",
    "avaliacao": null,
    "data": "23/07/2026 11:10"
  },
  {
    "protocolo": "571131922",
    "motivo": "Resolução de dúvida",
    "nome": "Tecnolab - Luana",
    "avaliacao": null,
    "data": "23/07/2026 09:42"
  },
  {
    "protocolo": "571128385",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "23/07/2026 09:36"
  },
  {
    "protocolo": "570943496",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "",
    "avaliacao": null,
    "data": "22/07/2026 13:30"
  },
  {
    "protocolo": "570927147",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Patrícia",
    "avaliacao": 5.0,
    "data": "22/07/2026 12:43"
  },
  {
    "protocolo": "570837084",
    "motivo": "Resolução de dúvida",
    "nome": "Alfa - Danielly",
    "avaliacao": null,
    "data": "22/07/2026 09:39"
  },
  {
    "protocolo": "570811954",
    "motivo": "Resolução de dúvida",
    "nome": "Micro - Paulo",
    "avaliacao": null,
    "data": "22/07/2026 08:51"
  },
  {
    "protocolo": "570695956",
    "motivo": "Resolução de dúvida",
    "nome": "Célula MT - Jullya",
    "avaliacao": null,
    "data": "21/07/2026 15:28"
  },
  {
    "protocolo": "570623509",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "Acta - Luiz TI",
    "avaliacao": null,
    "data": "21/07/2026 12:41"
  },
  {
    "protocolo": "570619104",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "21/07/2026 12:29"
  },
  {
    "protocolo": "570583347",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "CIAP - Vitoria",
    "avaliacao": null,
    "data": "21/07/2026 11:18"
  },
  {
    "protocolo": "570570956",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "Anátomo - Fernanda",
    "avaliacao": null,
    "data": "21/07/2026 10:56"
  },
  {
    "protocolo": "570552305",
    "motivo": "Resolução de dúvida",
    "nome": "Célula MT - Jullya",
    "avaliacao": null,
    "data": "21/07/2026 10:24"
  },
  {
    "protocolo": "570545974",
    "motivo": "Resolução de dúvida",
    "nome": "Multipat - Adrielle",
    "avaliacao": null,
    "data": "21/07/2026 10:12"
  },
  {
    "protocolo": "570535701",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "AC CAMARGO - Gustavo Farias",
    "avaliacao": null,
    "data": "21/07/2026 09:55"
  },
  {
    "protocolo": "570535513",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "Acta - Renata",
    "avaliacao": null,
    "data": "21/07/2026 09:54"
  },
  {
    "protocolo": "570528625",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "DiPrever - Tatyane",
    "avaliacao": null,
    "data": "21/07/2026 09:43"
  },
  {
    "protocolo": "570527193",
    "motivo": "Resolução de dúvida",
    "nome": "Unimed - Gislaine",
    "avaliacao": null,
    "data": "21/07/2026 09:41"
  },
  {
    "protocolo": "570399533",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "20/07/2026 16:17"
  },
  {
    "protocolo": "570383429",
    "motivo": "Resolução de dúvida",
    "nome": "Indap - Camila",
    "avaliacao": null,
    "data": "20/07/2026 15:44"
  },
  {
    "protocolo": "570227632",
    "motivo": "Resolução de dúvida",
    "nome": "fmj - Luiz",
    "avaliacao": 0.0,
    "data": "20/07/2026 10:31"
  },
  {
    "protocolo": "570181019",
    "motivo": "Resolução de dúvida",
    "nome": "Scapulatempo - Luciana",
    "avaliacao": null,
    "data": "20/07/2026 09:18"
  },
  {
    "protocolo": "570172652",
    "motivo": "Resolução de dúvida",
    "nome": "DAP - Janaina",
    "avaliacao": null,
    "data": "20/07/2026 09:05"
  },
  {
    "protocolo": "570162959",
    "motivo": "Resolução de dúvida",
    "nome": "CIAP - Shekinah",
    "avaliacao": null,
    "data": "20/07/2026 08:48"
  },
  {
    "protocolo": "569943437",
    "motivo": "Encaminhado para o JIRA",
    "nome": "DAP - Ramon",
    "avaliacao": 10.0,
    "data": "17/07/2026 16:48"
  },
  {
    "protocolo": "569929880",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Debora",
    "avaliacao": null,
    "data": "17/07/2026 16:12"
  },
  {
    "protocolo": "569906765",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "17/07/2026 15:15"
  },
  {
    "protocolo": "569898601",
    "motivo": "Encaminhado para o JIRA",
    "nome": "Célula MT - Jullya",
    "avaliacao": null,
    "data": "17/07/2026 14:56"
  },
  {
    "protocolo": "569897896",
    "motivo": "Resolução de dúvida",
    "nome": "fmj - Luis",
    "avaliacao": null,
    "data": "17/07/2026 14:54"
  },
  {
    "protocolo": "569894752",
    "motivo": "Resolução de dúvida",
    "nome": "scapulatempo - ingrid",
    "avaliacao": null,
    "data": "17/07/2026 14:47"
  },
  {
    "protocolo": "569847743",
    "motivo": "Resolução de dúvida",
    "nome": "HE - Gilberto",
    "avaliacao": null,
    "data": "17/07/2026 12:38"
  },
  {
    "protocolo": "569840341",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene -  Gabriela",
    "avaliacao": null,
    "data": "17/07/2026 12:14"
  },
  {
    "protocolo": "569830895",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "scapulatempo - ingrid",
    "avaliacao": null,
    "data": "17/07/2026 11:49"
  },
  {
    "protocolo": "569816329",
    "motivo": "Resolução de dúvida",
    "nome": "Infolaudo - Sabrina",
    "avaliacao": null,
    "data": "17/07/2026 11:16"
  },
  {
    "protocolo": "569762607",
    "motivo": "Resolução de dúvida",
    "nome": "CEDAPI - ISABELLY",
    "avaliacao": null,
    "data": "17/07/2026 09:31"
  },
  {
    "protocolo": "569737790",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "17/07/2026 08:37"
  },
  {
    "protocolo": "569656731",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "16/07/2026 16:15"
  },
  {
    "protocolo": "569609721",
    "motivo": "Encaminhado para o JIRA",
    "nome": "Alfa - Danielly",
    "avaliacao": 10.0,
    "data": "16/07/2026 14:29"
  },
  {
    "protocolo": "569522806",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene -  Gabriela",
    "avaliacao": null,
    "data": "16/07/2026 10:53"
  },
  {
    "protocolo": "569509992",
    "motivo": "Problemas não atribuído ao sistema",
    "nome": "Teste",
    "avaliacao": null,
    "data": "16/07/2026 10:28"
  },
  {
    "protocolo": "569492757",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "16/07/2026 09:56"
  },
  {
    "protocolo": "569481674",
    "motivo": "Resolução de dúvida",
    "nome": "Acta - Renata",
    "avaliacao": null,
    "data": "16/07/2026 09:35"
  },
  {
    "protocolo": "569447625",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "LAPAC - Jefferson",
    "avaliacao": null,
    "data": "16/07/2026 08:22"
  },
  {
    "protocolo": "569377710",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "15/07/2026 16:29"
  },
  {
    "protocolo": "569373901",
    "motivo": "Resolução de dúvida",
    "nome": "Citomed - Maria Luisa",
    "avaliacao": null,
    "data": "15/07/2026 16:20"
  },
  {
    "protocolo": "569363144",
    "motivo": "Resolução de dúvida",
    "nome": "Neugen - Juliana",
    "avaliacao": null,
    "data": "15/07/2026 15:56"
  },
  {
    "protocolo": "569348246",
    "motivo": "Resolução de dúvida",
    "nome": "Scapulatempo - Luciana",
    "avaliacao": null,
    "data": "15/07/2026 15:24"
  },
  {
    "protocolo": "569270828",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "15/07/2026 12:20"
  },
  {
    "protocolo": "569251073",
    "motivo": "Parametrização",
    "nome": "Patogene - Camile",
    "avaliacao": null,
    "data": "15/07/2026 11:36"
  },
  {
    "protocolo": "569237736",
    "motivo": "Resolução de dúvida",
    "nome": "Cedapi - Fagner",
    "avaliacao": null,
    "data": "15/07/2026 11:10"
  },
  {
    "protocolo": "569204699",
    "motivo": "Resolução de dúvida",
    "nome": "IPCM - Aldrovany",
    "avaliacao": 10.0,
    "data": "15/07/2026 10:12"
  },
  {
    "protocolo": "569197380",
    "motivo": "Resolução de dúvida",
    "nome": "Célula MT - Jullya",
    "avaliacao": null,
    "data": "15/07/2026 10:00"
  },
  {
    "protocolo": "569197350",
    "motivo": "Resolução de dúvida",
    "nome": "Cepatho - Angela",
    "avaliacao": 10.0,
    "data": "15/07/2026 10:00"
  },
  {
    "protocolo": "568968742",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "14/07/2026 12:48"
  },
  {
    "protocolo": "568959460",
    "motivo": "Parametrização",
    "nome": "Cepam - Andressa",
    "avaliacao": 10.0,
    "data": "14/07/2026 12:23"
  },
  {
    "protocolo": "568907363",
    "motivo": "Resolução de dúvida",
    "nome": "Multipat - Adrielle",
    "avaliacao": 10.0,
    "data": "14/07/2026 10:40"
  },
  {
    "protocolo": "568899202",
    "motivo": "Resolução de dúvida",
    "nome": "Infolaudo - Arthur",
    "avaliacao": null,
    "data": "14/07/2026 10:26"
  },
  {
    "protocolo": "568849793",
    "motivo": "Resolução de dúvida",
    "nome": "CAP - Lucien",
    "avaliacao": 10.0,
    "data": "14/07/2026 08:58"
  },
  {
    "protocolo": "568746923",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "13/07/2026 16:13"
  },
  {
    "protocolo": "568582210",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "13/07/2026 10:43"
  },
  {
    "protocolo": "568573008",
    "motivo": "Resolução de dúvida",
    "nome": "Neugen - Daniela",
    "avaliacao": null,
    "data": "13/07/2026 10:28"
  },
  {
    "protocolo": "568562994",
    "motivo": "Resolução de dúvida",
    "nome": "Apoiolab - Alba",
    "avaliacao": null,
    "data": "13/07/2026 10:13"
  },
  {
    "protocolo": "568556881",
    "motivo": "Resolução de dúvida",
    "nome": "ApoioLab - Dra.Alba",
    "avaliacao": null,
    "data": "13/07/2026 10:04"
  },
  {
    "protocolo": "568261677",
    "motivo": "Resolução de dúvida",
    "nome": "CAP - Lucien",
    "avaliacao": 10.0,
    "data": "10/07/2026 14:59"
  },
  {
    "protocolo": "568204270",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "10/07/2026 12:26"
  },
  {
    "protocolo": "568196769",
    "motivo": "Resolução de dúvida",
    "nome": "Cedapi - Viviane",
    "avaliacao": 10.0,
    "data": "10/07/2026 12:04"
  },
  {
    "protocolo": "568189711",
    "motivo": "Resolução de dúvida",
    "nome": "Neugen - Daniela",
    "avaliacao": null,
    "data": "10/07/2026 11:47"
  },
  {
    "protocolo": "568157913",
    "motivo": "Resolução de dúvida",
    "nome": "Biofast - Jonathan Valdiero",
    "avaliacao": 10.0,
    "data": "10/07/2026 10:42"
  },
  {
    "protocolo": "568145938",
    "motivo": "Resolução de dúvida",
    "nome": "Accamargo - Saulo",
    "avaliacao": null,
    "data": "10/07/2026 10:20"
  },
  {
    "protocolo": "568139332",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "",
    "avaliacao": 10.0,
    "data": "10/07/2026 10:07"
  },
  {
    "protocolo": "568135780",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "LAB - Gustavo Henrique",
    "avaliacao": 10.0,
    "data": "10/07/2026 10:01"
  },
  {
    "protocolo": "568102799",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "MD - Renato",
    "avaliacao": null,
    "data": "10/07/2026 08:58"
  },
  {
    "protocolo": "568079536",
    "motivo": "Resolução de dúvida",
    "nome": "HE - Leonardo",
    "avaliacao": 10.0,
    "data": "10/07/2026 08:00"
  },
  {
    "protocolo": "568077211",
    "motivo": "Parametrização",
    "nome": "Biofast - Jonathan Valdiero",
    "avaliacao": null,
    "data": "10/07/2026 07:48"
  },
  {
    "protocolo": "567782416",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "Anatomo - Fernanda",
    "avaliacao": null,
    "data": "08/07/2026 16:52"
  },
  {
    "protocolo": "567762376",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "08/07/2026 16:06"
  },
  {
    "protocolo": "567729996",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "CIAP - Clebert",
    "avaliacao": null,
    "data": "08/07/2026 14:57"
  },
  {
    "protocolo": "567706011",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "08/07/2026 14:05"
  },
  {
    "protocolo": "567674573",
    "motivo": "Resolução de dúvida",
    "nome": "Lab HE - Dr. Yuri",
    "avaliacao": null,
    "data": "08/07/2026 12:44"
  },
  {
    "protocolo": "567654169",
    "motivo": "Parametrização",
    "nome": "Marta - indap",
    "avaliacao": null,
    "data": "08/07/2026 11:52"
  },
  {
    "protocolo": "567648150",
    "motivo": "Equipamentos (Scanner e Impressora)",
    "nome": "Cepatho - Myrella",
    "avaliacao": null,
    "data": "08/07/2026 11:40"
  },
  {
    "protocolo": "567630319",
    "motivo": "Parametrização",
    "nome": "Cepam - Andressa",
    "avaliacao": 10.0,
    "data": "08/07/2026 11:09"
  },
  {
    "protocolo": "567552380",
    "motivo": "Encaminhado para o JIRA",
    "nome": "CIAP - Clebert",
    "avaliacao": null,
    "data": "08/07/2026 08:44"
  },
  {
    "protocolo": "567552249",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "08/07/2026 08:44"
  },
  {
    "protocolo": "567471207",
    "motivo": "Resolução de dúvida",
    "nome": "FVMD - Francisco",
    "avaliacao": 10.0,
    "data": "07/07/2026 16:43"
  },
  {
    "protocolo": "567340317",
    "motivo": "Resolução de dúvida",
    "nome": "Neugen - Daniela",
    "avaliacao": null,
    "data": "07/07/2026 11:47"
  },
  {
    "protocolo": "567328913",
    "motivo": "Resolução de dúvida",
    "nome": "Lab - Raquel",
    "avaliacao": null,
    "data": "07/07/2026 11:25"
  },
  {
    "protocolo": "567327538",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "07/07/2026 11:22"
  },
  {
    "protocolo": "567320612",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "07/07/2026 11:10"
  },
  {
    "protocolo": "567143283",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "06/07/2026 16:28"
  },
  {
    "protocolo": "566948877",
    "motivo": "Resolução de dúvida",
    "nome": "Ampliar - Norma",
    "avaliacao": 10.0,
    "data": "06/07/2026 10:20"
  },
  {
    "protocolo": "566882131",
    "motivo": "Resolução de dúvida",
    "nome": "CIAP - Kelly",
    "avaliacao": null,
    "data": "06/07/2026 08:31"
  },
  {
    "protocolo": "566706988",
    "motivo": "Resolução de dúvida",
    "nome": "Patogene - Elaine",
    "avaliacao": null,
    "data": "03/07/2026 17:31"
  },
  {
    "protocolo": "566646667",
    "motivo": "Atendimento não realizado, sem resposta do cliente",
    "nome": "Não se identificou",
    "avaliacao": null,
    "data": "03/07/2026 14:56"
  },
  {
    "protocolo": "566632148",
    "motivo": "Resolução de dúvida",
    "nome": "Biogenar - Catalina",
    "avaliacao": null,
    "data": "03/07/2026 14:22"
  },
  {
    "protocolo": "566575492",
    "motivo": "Resolução de dúvida",
    "nome": "Cedapi - Adimeri",
    "avaliacao": null,
    "data": "03/07/2026 11:51"
  },
  {
    "protocolo": "566571172",
    "motivo": "Resolução de dúvida",
    "nome": "Acta - Fernando",
    "avaliacao": null,
    "data": "03/07/2026 11:42"
  },
  {
    "protocolo": "566506779",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "03/07/2026 09:39"
  },
  {
    "protocolo": "566378492",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "02/07/2026 15:42"
  },
  {
    "protocolo": "566344225",
    "motivo": "Resolução de dúvida",
    "nome": "CIAP - Beatriz",
    "avaliacao": null,
    "data": "02/07/2026 14:27"
  },
  {
    "protocolo": "566332812",
    "motivo": "Resolução de dúvida",
    "nome": "Não se identificou",
    "avaliacao": null,
    "data": "02/07/2026 14:01"
  },
  {
    "protocolo": "566304330",
    "motivo": "Problemas não atribuído ao sistema",
    "nome": "Marta - indap",
    "avaliacao": null,
    "data": "02/07/2026 12:44"
  },
  {
    "protocolo": "566276054",
    "motivo": "Resolução de dúvida",
    "nome": "Liga - Joice",
    "avaliacao": 10.0,
    "data": "02/07/2026 11:32"
  },
  {
    "protocolo": "566266882",
    "motivo": "Resolução de dúvida",
    "nome": "Acta - Renata",
    "avaliacao": null,
    "data": "02/07/2026 11:14"
  },
  {
    "protocolo": "566169763",
    "motivo": "Resolução de dúvida",
    "nome": "Alfa - Danielly",
    "avaliacao": 10.0,
    "data": "02/07/2026 08:00"
  },
  {
    "protocolo": "566065640",
    "motivo": "Resolução de dúvida",
    "nome": "Ampliar - Milena",
    "avaliacao": null,
    "data": "01/07/2026 15:11"
  },
  {
    "protocolo": "565986864",
    "motivo": "Resolução de dúvida",
    "nome": "Célula MT - Jullya",
    "avaliacao": null,
    "data": "01/07/2026 12:08"
  },
  {
    "protocolo": "565986008",
    "motivo": "Resolução de dúvida",
    "nome": "Multipat -  Lara Rachel",
    "avaliacao": null,
    "data": "01/07/2026 12:06"
  },
  {
    "protocolo": "565969177",
    "motivo": "Resolução de dúvida",
    "nome": "Multipat - Ana Julia",
    "avaliacao": null,
    "data": "01/07/2026 11:32"
  },
  {
    "protocolo": "565951547",
    "motivo": "Resolução de dúvida",
    "nome": "Multipat -  Lara Rachel",
    "avaliacao": null,
    "data": "01/07/2026 11:00"
  },
  {
    "protocolo": "565946034",
    "motivo": "Resolução de dúvida",
    "nome": "Lupetec - Rogério",
    "avaliacao": null,
    "data": "01/07/2026 10:50"
  },
  {
    "protocolo": "565909158",
    "motivo": "Resolução de dúvida",
    "nome": "Ampliar - Antonia",
    "avaliacao": 10.0,
    "data": "01/07/2026 09:49"
  },
  {
    "protocolo": "565908267",
    "motivo": "Resolução de dúvida",
    "nome": "Ampliar -  Antonia",
    "avaliacao": null,
    "data": "01/07/2026 09:47"
  }
];
