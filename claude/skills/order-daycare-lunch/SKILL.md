---
name: daycare-lunch
description: Manage school lunch ordering for preschool with catered meals. Analyzes menus based on preferences (avoid rice, prefer BBQ and mac & cheese), helps select meals, processes orders from any source (PDF/screenshot/browser/verbal), and generates calendar reminders for days when lunch needs to be packed. Use when discussing school meals, menu selection, or packing lunch.
allowed-tools: Bash, Read
---

# Preschool Lunch Ordering

Help manage lunch ordering for a preschool student who receives catered lunches. This includes analyzing menus, helping select meals based on preferences, processing orders, and generating calendar reminders for days when lunch needs to be packed.

## Quick Reference

**Key Preferences:**
- ❌ NEVER order rice-based meals (100% avoidance)
- ❌ Avoid tomato pasta and pizza
- ✅ Prefer BBQ items, mac & cheese, chicken nuggets, Alfredo pasta, breakfast items

For complete preferences, see [PREFERENCES.md](PREFERENCES.md).

## Workflow

### 1. Menu Analysis

When user shares a menu (via **any source**: PDF, screenshot, browser, photo, or verbally):

1. Identify meals to **skip** based on preferences
2. Highlight **recommended** meals
3. Flag new items that might contain rice or tomato
4. Note when favorite items appear

**Proactively warn** about rice-based meals - this is the #1 rule.

### 2. Order Processing

After user places an order, they'll share confirmation via **any source**:
- PDF receipt, screenshot, browser page, photo, or verbal list

**Extract (source-agnostic):**
- Order month and year
- List of dates food was ordered

### 3. Generate Calendar File

Once you have ordered dates:

1. **Determine school days** in that month (Mon-Fri, excluding holidays)
2. **Calculate skipped days** = School days - Ordered days
3. **Run the ICS generator script**:
   ```bash
   python generate_ics.py -m [MONTH] -y [YEAR] -d [COMMA_SEPARATED_DAYS]
   ```
   Example: `python generate_ics.py -m 7 -y 2025 -d 3,9,16,21,31`

4. **Provide the generated ICS file** to the user for calendar import

The script creates all-day "Free" events (won't block scheduling) for each skipped day with the title "Pack Child's Lunch". The user can customize the child's name and location using optional flags `--child-name` and `--location` if needed.

## Important Notes

- **Rice rule #1**: Never order rice-based meals - this is universal. Proactively warn about rice dishes when analyzing menus.
- **School calendar**: Typically Mon-Fri, exclude major holidays (Thanksgiving, July 4, etc.)
- **Price**: $3.37 per meal (as of 2025)
- **Timezone**: America/New_York
