import React from 'react';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

export interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

export interface ModuleCardProps {
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  bgImage?: string;
}