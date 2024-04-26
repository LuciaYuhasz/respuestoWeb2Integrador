// Inicializa el carrito de compras recuperando datos del almacenamiento local o como un array vacío si no hay nada almacenado.
let carrito = JSON.parse(localStorage.getItem('cart')) || [];
let products = []; // Array para almacenar los productos cargados desde el servidor.

// Espera a que el contenido del DOM esté completamente cargado antes de ejecutar la lógica.
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    // Diferencia las funciones a cargar según la página en la que se encuentre el usuario.
    if (document.title.includes("Carrito de Compras")) {
        loadCart();
        setupCartPageEventListeners(); // Inicia los listeners específicos para la página del carrito.
    } else {
        fetchProducts();
        setupProductPageEventListeners(); // Inicia los listeners específicos para la página de productos.
    }
});

// Configura los listeners para los botones en la página del carrito.
function setupCartPageEventListeners() {
    const backButton = document.getElementById('backButton');
    const cancelButton = document.getElementById('cancelButton');
    const checkoutButton = document.getElementById('checkoutButton');

    backButton.addEventListener('click', () => {
        window.location.href = 'index.html'; // Navega de vuelta a la página principal.
    });

    cancelButton.addEventListener('click', () => {
        clearCartAndExit(); // Limpia el carrito y sale.
    });

    checkoutButton.addEventListener('click', checkout); // Inicia el proceso de checkout.
}

// Función para limpiar el carrito y redirigir al usuario.
function clearCartAndExit() {
    carrito = [];
    saveCart();
    window.location.href = 'index.html'; // Redirige al inicio.
}


function setupProductPageEventListeners() {
    document.getElementById('products').addEventListener('click', function (event) {
        if (event.target.classList.contains('add-to-cart-button')) {
            const productId = parseInt(event.target.getAttribute('data-product-id'));
            addToCart(productId);
        }
    });
}


function fetchProducts() {
    fetch('http://localhost:3000/productos-con-ofertas')
        .then(response => response.json())
        .then(data => {
            products = data;
            displayProducts(products);
        })
        .catch(error => console.error('Error loading the products:', error));
}

// Renderiza los productos en la página de la tienda.
function displayProducts(products) {
    const container = document.getElementById('products');
    container.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'card';

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        imageContainer.innerHTML = `
            <img src="${product.image}" alt="${product.title}" style="height:200px; object-fit: cover;">
            ${product.enOferta ? '<div class="offer-badge">¡Oferta!</div>' : ''}
        `;

        const descuento = product.precioOriginal - product.precioDescuento;
        const precioConDescuento = product.precioDescuento.toFixed(2);
        const porcentajeDescuento = Math.round((descuento / product.precioOriginal) * 100);

        const productInfo = document.createElement('div');
        const description = product.description.length > 30 ? product.description.substring(0, 30) + "..." : product.description;
        productInfo.innerHTML = `
            <h2>${product.title}</h2>
            <div class="tooltip">
                <p class="description">${description}</p>
                <span class="tooltiptext">${product.description}</span>
            </div>
            <p>Categoría: ${product.category}</p>
            <p>Precio original: $${product.precioOriginal.toFixed(2)}</p>
            ${product.enOferta ? `<p>${porcentajeDescuento}% OFF !</p>
                                  <p>Precio con descuento: $${product.precioDescuento.toFixed(2)}</p>
                                  <p>Te estás ahorrando: $${descuento.toFixed(2)}</p>` : ''}
            <button class="add-to-cart-button" data-product-id="${product.id}">Añadir al Carrito</button>
        `;

        card.appendChild(imageContainer);
        card.appendChild(productInfo);
        container.appendChild(card);
    });
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cartItems');
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '';
        let totalPrice = 0;

        if (carrito.length === 0) {
            cartItemsContainer.innerHTML = '<p>Tu carrito está vacío.</p>';
        } else {

            carrito.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.className = 'cart-item';
                itemElement.innerHTML = `
                    <img src="${item.image}" alt="${item.title}" style="width:60px; height:60px;">
                    ${item.title} - $${(item.precioDescuento || item.precioOriginal).toFixed(2)} x ${item.quantity} = $${((item.precioDescuento || item.precioOriginal) * item.quantity).toFixed(2)}
                    <div>
                        <button onclick="updateQuantity(${index}, ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${index}, ${item.quantity + 1})">+</button>
                    </div>
                    <button onclick="window.removeFromCart(${index})">Eliminar</button>
                `;
                cartItemsContainer.appendChild(itemElement);


                totalPrice += (item.precioDescuento || item.precioOriginal) * item.quantity;
            });
        }


        document.getElementById('totalPrice').textContent = `Total: $${totalPrice.toFixed(2)}`;
    }
}



// Guarda el estado actual del carrito en el almacenamiento local.
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(carrito));
}

// Añade un producto al carrito.
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existingProduct = carrito.find(item => item.id === productId);
    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        carrito.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    saveCart();
}


function loadCart() {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
        carrito = JSON.parse(storedCart);
        updateCartUI();
    }
}


function checkout() {
    const productosParaComprar = carrito.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.precioDescuento || item.precioOriginal
    }));

    fetch('http://localhost:3000/comprar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productosParaComprar)
    })
        .then(response => response.json().then(data => ({ status: response.status, data: data })))
        .then(result => {
            if (result.status !== 200) {
                throw new Error(`Error en la compra con código de estado: ${result.status}`);
            }
            alert('Tu compra fue realizada exitosamente');
            carrito = [];
            saveCart();
            updateCartUI();
        })
        .catch(error => {
            console.error('Error al realizar la compra:', error);
            alert('Error al realizar la compra: ' + error.message);
        });
}

// Funciones para actualizar y eliminar productos del carrito.
window.updateQuantity = function (index, quantity) {
    quantity = parseInt(quantity);
    if (quantity < 1) {
        window.removeFromCart(index);
    } else {
        carrito[index].quantity = quantity;
        updateCartUI();
        saveCart();
    }
};

window.removeFromCart = function (index) {
    carrito.splice(index, 1);
    updateCartUI();
    saveCart();
};
