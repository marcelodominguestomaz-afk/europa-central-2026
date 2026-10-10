# Ramo de ferramentas

Ramo auxiliar do guia, separado do site publicado (que fica em `main`). Quando `tools/request.json` muda, o GitHub Actions consulta fontes públicas — tamanho das fotos no Wikimedia Commons, rotas a pé e de carro no OpenStreetMap (routing.openstreetmap.de) e consultas Overpass — e grava `tools/result.json` neste ramo. Pode ser apagado sem afetar o site.
