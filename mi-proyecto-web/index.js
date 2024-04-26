
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { promises as fs } from 'fs';
import translate from 'node-google-translate-skidz';

const app = express(); // Creación de la aplicación Express
const PORT = 3001; // Definición del puerto de escucha del servidor

// Middleware para permitir solicitudes CORS desde cualquier dominio
app.use(cors());

// Middleware para parsear JSON en las solicitudes entrantes
app.use(express.json());

// Middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Función para traducir texto utilizando Google Translate
async function translateText(text, sourceLang, targetLang) {
    try {
        const result = await translate({
            text: text,
            source: sourceLang,
            target: targetLang
        });
        return result.translation;
    } catch (error) {
        console.error('Translation error:', error);
        throw new Error('Translation service failed');
    }
}

// Endpoint para obtener productos y aplicarles ofertas y traducciones
app.get('/productos-con-ofertas', async (req, res) => {
    try {
        // Petición a la API externa para obtener productos
        const response = await axios.get('https://fakestoreapi.com/products');
        let productos = response.data;

        // Lectura de las ofertas desde un archivo local
        const ofertas = JSON.parse(await fs.readFile('./ofertas.json', 'utf-8'));

        // Traducción de datos y aplicación de ofertas
        const productosTraducidos = await Promise.all(productos.map(async producto => {
            producto.description = await translateText(producto.description, 'en', 'es');
            producto.title = await translateText(producto.title, 'en', 'es');
            producto.category = await translateText(producto.category, 'en', 'es');

            const oferta = ofertas.find(o => o.id === producto.id);
            if (oferta) {
                const descuento = producto.price * oferta.descuento / 100;
                producto.precioOriginal = producto.price;
                producto.precioDescuento = producto.price - descuento;
                producto.enOferta = true;
            } else {
                producto.enOferta = false;
                producto.precioOriginal = producto.price;
                producto.precioDescuento = producto.price;
            }
            return producto;
        }));

        // Envío de productos traducidos y con ofertas aplicadas
        res.json(productosTraducidos);
    } catch (error) {
        console.error('Error al obtener y traducir productos:', error);
        res.status(500).send('Error en el servidor al procesar productos');
    }
});




app.post('/comprar', async (req, res) => {
    try {
        // Lectura del archivo de compras
        const data = await fs.readFile('./compras3001.json', 'utf-8');
        let compras = JSON.parse(data);


        const nuevaCompraId = compras.length + 1;

        const nuevaCompra = {
            id: nuevaCompraId,  // Asigna un ID secuencial
            productos: req.body.map(producto => ({
                id: producto.id,
                quantity: producto.quantity,
                price: producto.price
            }))
        };

        // Agregar la nueva compra al array de compras
        compras.push(nuevaCompra);

        // Escribir el archivo de compras actualizado
        await fs.writeFile('./compras3001.json', JSON.stringify(compras, null, 2));

        // Enviar respuesta al cliente
        res.status(200).json({ message: "Compra realizada con éxito", idCompra: nuevaCompraId });
    } catch (err) {
        console.error('Error al procesar la compra:', err);
        res.status(500).send('Error en el servidor al procesar la compra');
    }
});


// Inicio del servidor en el puerto definido
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});