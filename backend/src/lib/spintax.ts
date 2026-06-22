/**
 * spintax.ts
 *
 * Utilitário para processar Spintax em templates de mensagens de prospecção.
 * Exemplo: "{Olá|Oi|Tudo bem} {amigo|parceiro}"
 * Sorteia aleatoriamente uma das opções separadas por "|" dentro das chaves.
 * Suporta múltiplas ocorrências e aninhamentos.
 */

export function parseSpintax(text: string): string {
  if (!text) return '';

  const regex = /\{([^{}]+)\}/g;
  let result = text;

  // Processa de dentro para fora no caso de Spintax aninhada (ex: {A|{B|C}})
  while (regex.test(result)) {
    result = result.replace(regex, (_match, optionsStr) => {
      const options = optionsStr.split('|');
      const randomIndex = Math.floor(Math.random() * options.length);
      return options[randomIndex];
    });
  }

  return result;
}
