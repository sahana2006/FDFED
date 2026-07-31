import { Injectable } from '@nestjs/common';

export type Medicine = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
};

@Injectable()
export class MedicinesService {
  private readonly medicines: Medicine[] = [
    {
      id: 'MED001',
      name: 'Iodex Fast Relief Balm',
      price: 169.1,
      category: 'Pain Relief',
      description: 'Topical balm for muscle aches, joint pain, and back pain.',
    },
    {
      id: 'MED002',
      name: 'Moov Pain Relief Spray',
      price: 339,
      category: 'Pain Relief',
      description: 'Spray-based pain relief for quick application on sore areas.',
    },
    {
      id: 'MED003',
      name: 'Metformin 500mg',
      price: 45,
      category: 'Diabetes Care',
      description: 'Common oral medicine used to help manage blood sugar levels.',
    },
    {
      id: 'MED004',
      name: 'Glucon-D Orange',
      price: 180,
      category: 'Diabetes Care',
      description: 'Energy drink mix with glucose for quick replenishment.',
    },
    {
      id: 'MED005',
      name: 'Aspirin 75mg',
      price: 28,
      category: 'Cardiac Care',
      description: 'Low-dose aspirin commonly used in cardiac care plans.',
    },
    {
      id: 'MED006',
      name: 'Atorvastatin 10mg',
      price: 95,
      category: 'Cardiac Care',
      description: 'Prescription medicine used to help manage cholesterol.',
    },
  ];

  findAll(): Medicine[] {
    return this.medicines.map((medicine) => ({ ...medicine }));
  }

  findById(id: string): Medicine | undefined {
    const medicine = this.medicines.find((item) => item.id === id);
    return medicine ? { ...medicine } : undefined;
  }
}
