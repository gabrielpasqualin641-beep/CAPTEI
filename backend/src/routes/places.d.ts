export declare function mapOsmNichoToTags(termo: string): string[];
export interface OsmFilters {
    apenasComTelefone?: boolean;
    ocultarInstituicoes?: boolean;
    palavrasExcluir?: string;
    palavrasObrigatorias?: string;
}
/**
 * runOsmSearch — Função pura exportada.
 * Executa busca OSM/Overpass para nicho + cidade.
 * Usada pelo endpoint local e pelo Worker nacional.
 */
export declare function runOsmSearch(nicho: string, cidade: string, filters?: OsmFilters): Promise<any[]>;
export declare const placesRoutes: import("express-serve-static-core").Router;
//# sourceMappingURL=places.d.ts.map