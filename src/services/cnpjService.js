
export const cnpjService = {
    async consultCNPJ(cnpj) {
        // Remove non-numeric characters
        const cleanCNPJ = cnpj.replace(/[^\d]/g, '');

        if (cleanCNPJ.length !== 14) {
            throw new Error('CNPJ deve ter 14 dígitos.');
        }

        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('CNPJ não encontrado.');
                }
                throw new Error('Erro ao consultar CNPJ.');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro na consulta de CNPJ:', error);
            throw error;
        }
    }
};
