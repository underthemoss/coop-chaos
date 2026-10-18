"""Compatibility entry point: current tree source qualification is shared by all
three true-metre tree assets. The adjacent v3/v4 JSON is historical evidence.
"""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).resolve().parents[1]/'trees/qualify.py'),run_name='__main__')
