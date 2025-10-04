#!/usr/bin/env python3

import sys
import os
sys.path.append('/Users/darrenshen/projects/A10Hacks/backend')

from agents.batch_processor import country_batch_manager

print("Testing country batch manager...")
countries = country_batch_manager.get_available_countries()
print(f"Available countries: {countries}")
