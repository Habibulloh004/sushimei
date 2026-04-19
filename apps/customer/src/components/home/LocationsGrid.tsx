"use client";

import React from 'react';
import { motion } from 'motion/react';
import { MapPin, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Spot } from '@/lib/api';
import { formatPrice } from '@/lib/format';

interface LocationsGridProps {
  spots: Spot[];
}

export function LocationsGrid({ spots }: LocationsGridProps) {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-12 py-12 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4 mb-16"
      >
        <h3 className="text-4xl font-black tracking-tighter">Our Locations</h3>
        <p className="text-stone-500 font-medium">Find a Sushi Mei branch near you for the freshest experience.</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {spots.map((spot, index) => (
          <motion.div
            key={spot.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="p-8 bg-white dark:bg-stone-900 rounded-[2.5rem] border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 duration-300"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-stone-900 dark:text-white" />
              </div>
              <Badge variant={spot.is_active ? 'success' : 'warning'}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${spot.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {spot.is_active ? 'Open' : 'Closed'}
              </Badge>
            </div>
            <h4 className="text-xl font-black tracking-tight mb-2">{spot.name}</h4>
            <p className="text-sm text-stone-500 mb-6">{spot.address_line1}, {spot.city}</p>
            <div className="flex items-center justify-between pt-6 border-t border-stone-100 dark:border-stone-800">
              <span className="text-xs font-black uppercase tracking-widest text-stone-400">
                Min. Order: {formatPrice(spot.minimum_order)}
              </span>
              <Button variant="ghost" size="sm" className="p-0 text-red-600">
                Get Directions <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
