import React from "react";
import "./EcommerceStore.css";

function EcommerceStore() {
  return (
    <div>
      {/* Navbar */}
      <header>
        <nav className="navbar">
          <div className="nav-logo">
            <img src="/images/logoImg.png" alt="ShopSphere Logo" />
            <h2>ShopSphere</h2>
          </div>

          <div className="nav-search">
            <input
              type="text"
              placeholder="Search for products, brands, categories..."
            />
            <button>🔍</button>
          </div>

          <div className="nav-icons">
            <div className="icon">
              🛒 <span className="badge">3</span>
            </div>
            <div className="icon">👤</div>
            <div className="icon">❤️</div>
          </div>
        </nav>
      </header>

      {/* Main Intro Section */}
      <div className="container">
        <div className="info-container">
          <h1>Welcome to ShopSphere</h1>
          <h3>Trendy Items for Everyone!</h3>
          <p>
            Find the latest collections for men, women, boys, and girls — all
            in one place. Fast, simple, and effortless shopping at your
            fingertips.
          </p>
        </div>
        <div className="image-container">
          <img
            src="/images/mainContainerIMG2.png"
            alt="ShopSphere Banner"
          />
        </div>
      </div>

      {/* Categories Section */}
      <div className="table-section">
        <h2 className="section-title">Shop by Category</h2>
        <div className="table-grid">
          <a
            href="https://www.snitch.co.in/collections/all-products"
            target="_blank"
            rel="noopener noreferrer"
            className="table-cell"
          >
            <img src="/images/menClothes.png" alt="Men Clothes" />
            <div className="table-info">Men</div>
          </a>

          <a
            href="https://www.myntra.com/women-clothing"
            target="_blank"
            rel="noopener noreferrer"
            className="table-cell"
          >
            <img src="/images/womenClothes.png" alt="Women Clothes" />
            <div className="table-info">Women</div>
          </a>

          <a
            href="https://www.flipkart.com/q/boys-clothes"
            target="_blank"
            rel="noopener noreferrer"
            className="table-cell"
          >
            <img src="/images/boyKidClothes.png" alt="Boy Clothes" />
            <div className="table-info">Boys</div>
          </a>

          <a
            href="https://www.amazon.in/s?k=girls+clothes"
            target="_blank"
            rel="noopener noreferrer"
            className="table-cell"
          >
            <img src="/images/girlKidClothes.png" alt="Girl Clothes" />
            <div className="table-info">Girls</div>
          </a>
        </div>
      </div>

      {/* Deals Section */}
      <div className="deals-section">
        <h2 className="section-title">Hot Deals</h2>
        <div className="deals-grid">
          <button className="deal-card">
            <img src="/images/men50Off.jpg" alt="Deal 1" />
            <div className="deal-info">50% Off Men</div>
          </button>

          <button className="deal-card">
            <img src="/images/boyKid80Off.png" alt="Deal 4" />
            <div className="deal-info">80% Off Boys</div>
          </button>

          <button className="deal-card">
            <img src="/images/women30Off.png" alt="Deal 2" />
            <div className="deal-info">30% Off Women</div>
          </button>

          <button className="deal-card">
            <img src="/images/girlKid70Off.png" alt="Deal 3" />
            <div className="deal-info">70% Off Girls</div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        &copy; 2025 ShopSphere. All Rights Reserved.
      </footer>

      {/* ChatBot Button */}
      {/* <div className="chatbot"> 💬 Chat with us </div> */}
    </div>
  );
}

export default EcommerceStore;
