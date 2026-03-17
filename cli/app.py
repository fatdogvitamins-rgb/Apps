#!/usr/bin/env python3

"""Simple CLI tool example.

Usage:
  python cli/app.py greet --name Alice
  python cli/app.py math --operation add --x 2 --y 3
"""

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description="Sample CLI tool")
    sub = parser.add_subparsers(dest="cmd", required=True)

    greet = sub.add_parser("greet", help="Print a greeting")
    greet.add_argument("--name", default="world", help="Name to greet")

    math = sub.add_parser("math", help="Do a simple math operation")
    math.add_argument("--operation", choices=["add", "sub", "mul", "div"], default="add")
    math.add_argument("--x", type=float, required=True)
    math.add_argument("--y", type=float, required=True)

    args = parser.parse_args()

    if args.cmd == "greet":
        print(f"Hello, {args.name}!")
    elif args.cmd == "math":
        if args.operation == "add":
            res = args.x + args.y
        elif args.operation == "sub":
            res = args.x - args.y
        elif args.operation == "mul":
            res = args.x * args.y
        elif args.operation == "div":
            res = args.x / args.y
        else:
            raise SystemExit("Unsupported operation")
        print(res)


if __name__ == "__main__":
    main()
