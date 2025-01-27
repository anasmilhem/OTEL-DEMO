export interface Product {
    _id: string;
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