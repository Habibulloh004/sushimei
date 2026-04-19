import { z } from 'zod';

const UZ_PHONE_REGEX = /^\+998\d{9}$/;

export const phoneSchema = z.string()
  .transform(val => val.replace(/\D/g, ''))
  .transform(val => val.startsWith('998') ? `+${val}` : `+998${val}`)
  .pipe(z.string().regex(UZ_PHONE_REGEX, 'Enter a valid Uzbekistan phone number'));

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

export const otpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
});

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export const checkoutSchema = z.object({
  spotId: z.string().min(1, 'Select a branch'),
  deliveryType: z.enum(['delivery', 'pickup']),
  paymentType: z.enum(['CASH', 'CARD']),
  deliveryAddress: z.string().optional(),
  promoCode: z.string().optional(),
  bonusPoints: z.number().int().min(0).optional(),
}).refine(data => {
  if (data.deliveryType === 'delivery') {
    return data.deliveryAddress && data.deliveryAddress.trim().length >= 5;
  }
  return true;
}, {
  message: 'Delivery address is required for delivery orders',
  path: ['deliveryAddress'],
});
