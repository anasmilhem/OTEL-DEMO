export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    createdAt: string;
}

export interface CreateProductInput {
    name: string;
    description: string;
    price: number;
} 